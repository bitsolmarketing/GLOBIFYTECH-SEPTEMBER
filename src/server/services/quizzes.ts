import "server-only";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { gradeQuiz, seededShuffle, type GradableQuestion } from "@/lib/quiz-grading";
import type { QuestionInput, QuizInput } from "@/lib/validation/assessment";
import { requireEnrollment } from "./enrollments";
import { touchStreak } from "./progress";
import { evaluateAndCompleteIfReady } from "./completion";
import { awardBadge } from "./gamification";
import { orderedLessons } from "./courses";

export async function createQuiz(input: QuizInput) {
  return prisma.quiz.create({ data: { ...input, description: input.description || null } });
}

export async function updateQuiz(id: string, input: QuizInput) {
  return prisma.quiz.update({ where: { id }, data: { ...input, description: input.description || null } });
}

export async function deleteQuiz(id: string) {
  return prisma.quiz.delete({ where: { id } });
}

export async function getQuizForEditing(id: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id }, include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } }, image: true } }, course: { select: { id: true, title: true } }, lesson: { select: { id: true, title: true } }, _count: { select: { attempts: true } } } });
  if (!quiz) throw AppError.notFound("Quiz");
  return quiz;
}

export async function upsertQuestion(params: { quizId?: string; examId?: string; questionId?: string; input: QuestionInput }) {
  const { input } = params;
  const data = {
    type: input.type,
    prompt: input.prompt,
    explanation: input.explanation || null,
    imageMediaId: input.imageMediaId ?? null,
    codeLanguage: input.codeLanguage || null,
    codeStarter: input.codeStarter || null,
    topic: input.topic || null,
    difficulty: input.difficulty,
    points: input.points,
    answerKey: (input.answerKey ?? undefined) as never,
  };
  if (params.questionId) {
    return prisma.$transaction(async (tx) => {
      await tx.questionOption.deleteMany({ where: { questionId: params.questionId } });
      return tx.question.update({ where: { id: params.questionId }, data: { ...data, options: { create: input.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, matchKey: o.matchKey ?? null, order: i })) } } });
    });
  }
  const count = await prisma.question.count({ where: params.quizId ? { quizId: params.quizId } : { examId: params.examId } });
  return prisma.question.create({ data: { ...data, quizId: params.quizId ?? null, examId: params.examId ?? null, order: count, options: { create: input.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, matchKey: o.matchKey ?? null, order: i })) } } });
}

export async function deleteQuestion(id: string) {
  return prisma.question.delete({ where: { id } });
}

// ───────────── Student side ─────────────

export async function quizzesForStudent(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true, course: { select: { title: true } } } });
  const quizzes = await prisma.quiz.findMany({
    where: { courseId: { in: enrollments.map((e) => e.courseId) }, isPublished: true },
    orderBy: { createdAt: "asc" },
    include: { course: { select: { id: true, title: true } }, _count: { select: { questions: true } }, attempts: { where: { studentId }, orderBy: { startedAt: "desc" } } },
  });
  return quizzes.map((q) => {
    const graded = q.attempts.filter((a) => a.status === "GRADED");
    const best = graded.length ? Math.max(...graded.map((a) => Number(a.percent))) : null;
    return { ...q, bestPercent: best, attemptsUsed: q.attempts.length, inProgress: q.attempts.find((a) => a.status === "IN_PROGRESS") ?? null, passed: graded.some((a) => a.passed) };
  });
}

export async function startAttempt(params: { quizId: string; studentId: string; userId: string }) {
  const quiz = await prisma.quiz.findUnique({ where: { id: params.quizId }, include: { questions: { select: { id: true } } } });
  if (!quiz || !quiz.isPublished) throw AppError.notFound("Quiz");
  const now = new Date();
  if (quiz.availableFrom && quiz.availableFrom > now) throw AppError.validation("This quiz isn't open yet.");
  if (quiz.availableTo && quiz.availableTo < now) throw AppError.validation("This quiz has closed.");
  const enrollment = await requireEnrollment(params.studentId, quiz.courseId);

  const inProgress = await prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, studentId: params.studentId, status: "IN_PROGRESS" } });
  if (inProgress) {
    if (inProgress.expiresAt && inProgress.expiresAt < now) await expireAttempt(inProgress.id);
    else return inProgress;
  }
  const used = await prisma.quizAttempt.count({ where: { quizId: quiz.id, studentId: params.studentId } });
  if (used >= quiz.attemptLimit) throw AppError.validation(`You've used all ${quiz.attemptLimit} attempts.`);

  let ids = quiz.questions.map((q) => q.id);
  if (!ids.length) throw AppError.validation("This quiz has no questions yet.");
  const seed = `${quiz.id}:${params.studentId}:${used + 1}`;
  if (quiz.shuffleQuestions) ids = seededShuffle(ids, seed);
  if (quiz.questionsPerAttempt && quiz.questionsPerAttempt < ids.length) ids = ids.slice(0, quiz.questionsPerAttempt);

  await touchStreak(params.userId);
  return prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      studentId: params.studentId,
      enrollmentId: enrollment.id,
      attemptNumber: used + 1,
      questionIds: ids,
      expiresAt: quiz.timeLimitMinutes ? new Date(now.getTime() + quiz.timeLimitMinutes * 60_000) : null,
    },
  });
}

/** Attempt payload for the player: questions without correct-answer flags. */
export async function getAttemptForStudent(attemptId: string, studentId: string) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: { select: { id: true, title: true, timeLimitMinutes: true, shuffleOptions: true, showAnswersAfter: true, passingScore: true, courseId: true } }, answers: true } });
  if (!attempt || attempt.studentId !== studentId) throw AppError.forbidden();
  const questions = await prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, include: { options: { orderBy: { order: "asc" } }, image: { select: { url: true, alt: true } } } });
  const ordered = attempt.questionIds.map((id) => questions.find((q) => q.id === id)!).filter(Boolean);
  const revealed = attempt.status !== "IN_PROGRESS" && attempt.quiz.showAnswersAfter;
  return {
    attempt,
    questions: ordered.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      image: q.image,
      codeLanguage: q.codeLanguage,
      codeStarter: q.codeStarter,
      points: Number(q.points),
      topic: q.topic,
      explanation: revealed ? q.explanation : null,
      options: (attempt.quiz.shuffleOptions ? seededShuffle(q.options, `${attempt.id}:${q.id}`) : q.options).map((o) => ({ id: o.id, text: o.text, matchKey: q.type === "MATCHING" ? o.matchKey : undefined, isCorrect: revealed ? o.isCorrect : undefined })),
    })),
  };
}

export async function expireAttempt(attemptId: string) {
  await prisma.quizAttempt.update({ where: { id: attemptId }, data: { status: "EXPIRED", submittedAt: new Date() } });
}

export async function submitAttempt(params: { attemptId: string; studentId: string; userId: string; answers: Array<{ questionId: string; selectedOptionIds?: string[]; textAnswer?: string | null; structured?: unknown }> }) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: params.attemptId }, include: { quiz: true } });
  if (!attempt || attempt.studentId !== params.studentId) throw AppError.forbidden();
  if (attempt.status !== "IN_PROGRESS") throw AppError.conflict("This attempt has already been submitted.");
  const graceMs = 30_000;
  if (attempt.expiresAt && attempt.expiresAt.getTime() + graceMs < Date.now()) {
    await expireAttempt(attempt.id);
    throw AppError.validation("Time is up. This attempt has expired.");
  }
  const questions = await prisma.question.findMany({ where: { id: { in: attempt.questionIds } }, include: { options: true } });
  const gradable: GradableQuestion[] = questions.map((q) => ({ id: q.id, type: q.type, points: Number(q.points), topic: q.topic, answerKey: q.answerKey, options: q.options.map((o) => ({ id: o.id, isCorrect: o.isCorrect, matchKey: o.matchKey, order: o.order })) }));
  const result = gradeQuiz({ questions: gradable, answers: params.answers.filter((a) => attempt.questionIds.includes(a.questionId)), passingScore: attempt.quiz.passingScore, negativeMarking: Number(attempt.quiz.negativeMarking) });

  await prisma.$transaction(async (tx) => {
    await tx.quizAnswer.deleteMany({ where: { attemptId: attempt.id } });
    await tx.quizAnswer.createMany({
      data: result.answers.map((g) => {
        const given = params.answers.find((a) => a.questionId === g.questionId);
        return { attemptId: attempt.id, questionId: g.questionId, selectedOptionIds: given?.selectedOptionIds ?? [], textAnswer: given?.textAnswer ?? null, structured: (given?.structured ?? undefined) as never, isCorrect: g.isCorrect, pointsAwarded: g.pointsAwarded, needsManualGrading: g.needsManualGrading };
      }),
    });
    await tx.quizAttempt.update({
      where: { id: attempt.id },
      data: { status: result.needsManualGrading ? "SUBMITTED" : "GRADED", score: result.score, maxScore: result.maxScore, percent: result.percent, passed: result.passed, weakTopics: result.weakTopics, submittedAt: new Date(), gradedAt: result.needsManualGrading ? null : new Date() },
    });
  });

  await touchStreak(params.userId);
  if (!result.needsManualGrading) {
    if (attempt.enrollmentId) await evaluateAndCompleteIfReady(attempt.enrollmentId);
    const highScores = await prisma.quizAttempt.count({ where: { studentId: params.studentId, status: "GRADED", percent: { gte: 90 } } });
    if (highScores >= 5) await awardBadge(params.userId, "QUIZ_MASTER");
  }
  const recommended = result.weakTopics.length ? await recommendLessonsForTopics(attempt.quiz.courseId, result.weakTopics) : [];
  return { ...result, recommended };
}

/** Lessons whose title/objectives mention a weak topic. */
async function recommendLessonsForTopics(courseId: string, topics: string[]) {
  const { flat } = await orderedLessons(courseId);
  const lower = topics.map((t) => t.toLowerCase());
  return flat.filter((l) => lower.some((t) => l.title.toLowerCase().includes(t))).slice(0, 5).map((l) => ({ id: l.id, title: l.title }));
}

/** Instructor manual grading for subjective answers. */
export async function gradeManualAnswers(attemptId: string, grades: Array<{ questionId: string; pointsAwarded: number; graderNote?: string }>) {
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId }, include: { quiz: true, answers: true } });
  if (!attempt) throw AppError.notFound("Attempt");
  await prisma.$transaction(grades.map((g) => prisma.quizAnswer.update({ where: { attemptId_questionId: { attemptId, questionId: g.questionId } }, data: { pointsAwarded: g.pointsAwarded, needsManualGrading: false, isCorrect: g.pointsAwarded > 0, graderNote: g.graderNote ?? null } })));
  const answers = await prisma.quizAnswer.findMany({ where: { attemptId } });
  const score = answers.reduce((s, a) => s + Number(a.pointsAwarded), 0);
  const percent = Number(attempt.maxScore) ? Math.round((score / Number(attempt.maxScore)) * 10000) / 100 : 0;
  const pending = answers.some((a) => a.needsManualGrading);
  const updated = await prisma.quizAttempt.update({ where: { id: attemptId }, data: { score, percent, passed: !pending && percent >= attempt.quiz.passingScore, status: pending ? "SUBMITTED" : "GRADED", gradedAt: pending ? null : new Date() } });
  if (!pending && attempt.enrollmentId) await evaluateAndCompleteIfReady(attempt.enrollmentId);
  return updated;
}
