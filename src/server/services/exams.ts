import "server-only";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { gradeQuiz, seededShuffle, type GradableQuestion } from "@/lib/quiz-grading";
import { requireEnrollment } from "./enrollments";
import { evaluateAndCompleteIfReady } from "./completion";
import { notify } from "./notifications";
import { formatDateTime } from "@/lib/utils";

export interface ExamInput {
  courseId: string;
  batchId?: string | null;
  title: string;
  kind: "MIDTERM" | "FINAL" | "PRACTICAL" | "MOCK";
  description?: string;
  scheduledAt?: Date | null;
  durationMinutes: number;
  passingScore: number;
  attemptLimit: number;
  negativeMarking: number;
  shuffleQuestions: boolean;
  isPublished: boolean;
}

export async function createExam(input: ExamInput) {
  const exam = await prisma.exam.create({ data: { ...input, description: input.description || null, batchId: input.batchId ?? null, scheduledAt: input.scheduledAt ?? null } });
  if (exam.isPublished) await announceExam(exam.id);
  return exam;
}

export async function updateExam(id: string, input: ExamInput) {
  const before = await prisma.exam.findUnique({ where: { id }, select: { isPublished: true } });
  const exam = await prisma.exam.update({ where: { id }, data: { ...input, description: input.description || null, batchId: input.batchId ?? null, scheduledAt: input.scheduledAt ?? null } });
  if (exam.isPublished && !before?.isPublished) await announceExam(exam.id);
  return exam;
}

export async function deleteExam(id: string) {
  return prisma.exam.delete({ where: { id } });
}

async function announceExam(examId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { course: { select: { title: true } } } });
  if (!exam) return;
  const students = exam.batchId
    ? (await prisma.batchStudent.findMany({ where: { batchId: exam.batchId, leftAt: null }, select: { student: { select: { userId: true } } } })).map((b) => b.student.userId)
    : (await prisma.enrollment.findMany({ where: { courseId: exam.courseId, status: "ACTIVE" }, select: { student: { select: { userId: true } } } })).map((e) => e.student.userId);
  const when = exam.scheduledAt ? formatDateTime(exam.scheduledAt) : "soon";
  await Promise.all(students.map((userId) => notify({ userId, event: "EXAM_SCHEDULED", data: { exam: exam.title, course: exam.course.title, when }, href: "/student/exams", fallback: { title: `Exam scheduled: ${exam.title}`, body: `${exam.course.title} · ${when} · ${exam.durationMinutes} minutes` } })));
}

export async function examsForStudent(studentId: string) {
  const [enrollments, memberships] = await Promise.all([
    prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } }),
    prisma.batchStudent.findMany({ where: { studentId, leftAt: null }, select: { batchId: true } }),
  ]);
  const exams = await prisma.exam.findMany({
    where: { isPublished: true, courseId: { in: enrollments.map((e) => e.courseId) }, OR: [{ batchId: null }, { batchId: { in: memberships.map((m) => m.batchId) } }] },
    orderBy: [{ scheduledAt: "asc" }],
    include: { course: { select: { id: true, title: true } }, _count: { select: { questions: true } }, attempts: { where: { studentId }, orderBy: { startedAt: "desc" } } },
  });
  return exams.map((e) => ({ ...e, best: e.attempts.filter((a) => a.status === "GRADED").reduce<number | null>((m, a) => (m == null ? Number(a.percent) : Math.max(m, Number(a.percent))), null), inProgress: e.attempts.find((a) => a.status === "IN_PROGRESS") ?? null }));
}

export async function startExamAttempt(examId: string, studentId: string) {
  const exam = await prisma.exam.findUnique({ where: { id: examId }, include: { questions: { select: { id: true } } } });
  if (!exam || !exam.isPublished) throw AppError.notFound("Exam");
  await requireEnrollment(studentId, exam.courseId);
  const now = Date.now();
  if (exam.scheduledAt && exam.scheduledAt.getTime() - now > 15 * 60 * 1000) throw AppError.validation(`This exam opens at ${formatDateTime(exam.scheduledAt)}.`);
  const open = await prisma.examAttempt.findFirst({ where: { examId, studentId, status: "IN_PROGRESS" } });
  if (open) {
    if (open.expiresAt && open.expiresAt.getTime() < now) await prisma.examAttempt.update({ where: { id: open.id }, data: { status: "EXPIRED" } });
    else return open;
  }
  const used = await prisma.examAttempt.count({ where: { examId, studentId } });
  if (used >= exam.attemptLimit) throw AppError.validation("You've used all attempts for this exam.");
  if (!exam.questions.length) throw AppError.validation("This exam has no questions yet.");
  return prisma.examAttempt.create({ data: { examId, studentId, expiresAt: new Date(now + exam.durationMinutes * 60_000), answers: {} } });
}

export async function getExamAttempt(attemptId: string, studentId: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: { select: { id: true, title: true, durationMinutes: true, passingScore: true, shuffleQuestions: true, courseId: true } } } });
  if (!attempt || attempt.studentId !== studentId) throw AppError.forbidden();
  const questions = await prisma.question.findMany({ where: { examId: attempt.examId }, orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } }, image: { select: { url: true, alt: true } } } });
  const ordered = attempt.exam.shuffleQuestions ? seededShuffle(questions, attempt.id) : questions;
  return {
    attempt,
    questions: ordered.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, image: q.image, codeLanguage: q.codeLanguage, codeStarter: q.codeStarter, points: Number(q.points), topic: q.topic, explanation: null, options: q.options.map((o) => ({ id: o.id, text: o.text, matchKey: q.type === "MATCHING" ? o.matchKey : undefined })) })),
  };
}

export async function submitExamAttempt(attemptId: string, studentId: string, answers: Array<{ questionId: string; selectedOptionIds?: string[]; textAnswer?: string | null; structured?: unknown }>) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
  if (!attempt || attempt.studentId !== studentId) throw AppError.forbidden();
  if (attempt.status !== "IN_PROGRESS") throw AppError.conflict("This attempt is already submitted.");
  if (attempt.expiresAt && attempt.expiresAt.getTime() + 30_000 < Date.now()) {
    await prisma.examAttempt.update({ where: { id: attemptId }, data: { status: "EXPIRED", submittedAt: new Date() } });
    throw AppError.validation("Time is up. This attempt has expired.");
  }
  const questions = await prisma.question.findMany({ where: { examId: attempt.examId }, include: { options: true } });
  const gradable: GradableQuestion[] = questions.map((q) => ({ id: q.id, type: q.type, points: Number(q.points), topic: q.topic, answerKey: q.answerKey, options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect, matchKey: o.matchKey, order: o.order })) }));
  const result = gradeQuiz({ questions: gradable, answers, passingScore: attempt.exam.passingScore, negativeMarking: Number(attempt.exam.negativeMarking) });
  const updated = await prisma.examAttempt.update({
    where: { id: attemptId },
    data: { answers: Object.fromEntries(answers.map((a) => [a.questionId, a])) as never, status: result.needsManualGrading ? "SUBMITTED" : "GRADED", score: result.score, maxScore: result.maxScore, percent: result.percent, passed: result.passed, submittedAt: new Date(), gradedAt: result.needsManualGrading ? null : new Date() },
  });
  if (!result.needsManualGrading) {
    const enrollment = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: attempt.exam.courseId } }, select: { id: true } });
    if (enrollment) await evaluateAndCompleteIfReady(enrollment.id);
  }
  return { attempt: updated, result };
}

export async function gradeExamAttempt(attemptId: string, score: number, gradedById: string) {
  const attempt = await prisma.examAttempt.findUnique({ where: { id: attemptId }, include: { exam: true } });
  if (!attempt) throw AppError.notFound("Attempt");
  const percent = Number(attempt.maxScore) ? Math.round((score / Number(attempt.maxScore)) * 10000) / 100 : 0;
  const updated = await prisma.examAttempt.update({ where: { id: attemptId }, data: { score, percent, passed: percent >= attempt.exam.passingScore, status: "GRADED", gradedAt: new Date() } });
  const enrollment = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: attempt.studentId, courseId: attempt.exam.courseId } }, select: { id: true } });
  if (enrollment) await evaluateAndCompleteIfReady(enrollment.id);
  void gradedById;
  return updated;
}
