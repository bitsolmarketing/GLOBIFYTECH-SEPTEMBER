import "server-only";
import { prisma, type Prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { sanitizeRichText } from "@/lib/sanitize";
import type { AssignmentInput } from "@/lib/validation/assessment";
import { requireEnrollment } from "./enrollments";
import { notify } from "./notifications";
import { touchStreak } from "./progress";
import { evaluateAndCompleteIfReady } from "./completion";
import { awardBadge } from "./gamification";

export async function createAssignment(input: AssignmentInput) {
  return prisma.assignment.create({ data: { ...input, instructions: input.instructions ? sanitizeRichText(input.instructions) : null } });
}

export async function updateAssignment(id: string, input: AssignmentInput) {
  return prisma.assignment.update({ where: { id }, data: { ...input, instructions: input.instructions ? sanitizeRichText(input.instructions) : null } });
}

export async function deleteAssignment(id: string) {
  return prisma.assignment.delete({ where: { id } });
}

export async function assignmentsForStudent(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } });
  const assignments = await prisma.assignment.findMany({
    where: { courseId: { in: enrollments.map((e) => e.courseId) }, isPublished: true },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    include: { course: { select: { id: true, title: true } }, submissions: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 1, include: { files: { include: { media: true } }, feedback: { orderBy: { createdAt: "asc" } } } } },
  });
  return assignments.map((a) => ({ ...a, latest: a.submissions[0] ?? null }));
}

export async function getAssignmentForStudent(assignmentId: string, studentId: string) {
  const assignment = await prisma.assignment.findUnique({ where: { id: assignmentId }, include: { course: { select: { id: true, title: true } }, rubric: { include: { criteria: { orderBy: { order: "asc" } } } } } });
  if (!assignment || !assignment.isPublished) throw AppError.notFound("Assignment");
  await requireEnrollment(studentId, assignment.courseId);
  const submissions = await prisma.assignmentSubmission.findMany({ where: { assignmentId, studentId }, orderBy: { createdAt: "desc" }, include: { files: { include: { media: true } }, feedback: { orderBy: { createdAt: "asc" } }, rubricScores: { include: { criterion: true } }, reviewedBy: { select: { name: true } } } });
  return { assignment, submissions };
}

export async function submitAssignment(params: { studentId: string; userId: string; assignmentId: string; kind: "TEXT" | "FILE" | "URL" | "GITHUB" | "WEBSITE"; text?: string; url?: string; mediaIds: string[]; submit: boolean }) {
  const assignment = await prisma.assignment.findUnique({ where: { id: params.assignmentId } });
  if (!assignment || !assignment.isPublished) throw AppError.notFound("Assignment");
  const enrollment = await requireEnrollment(params.studentId, assignment.courseId);
  if (!assignment.allowedKinds.includes(params.kind)) throw AppError.validation("That submission type isn't allowed for this assignment.");
  if (params.kind === "TEXT" && !params.text?.trim()) throw AppError.validation("Write your answer before submitting.");
  if (["URL", "GITHUB", "WEBSITE"].includes(params.kind) && !params.url) throw AppError.validation("Add a link before submitting.");
  if (params.kind === "FILE" && !params.mediaIds.length) throw AppError.validation("Attach at least one file.");
  const now = new Date();
  const isLate = !!assignment.dueAt && now > assignment.dueAt;
  if (isLate && !assignment.allowLate && params.submit) throw AppError.validation("The deadline for this assignment has passed.");

  const latest = await prisma.assignmentSubmission.findFirst({ where: { assignmentId: assignment.id, studentId: params.studentId }, orderBy: { createdAt: "desc" } });
  if (latest && ["SUBMITTED", "UNDER_REVIEW"].includes(latest.status)) throw AppError.conflict("Your submission is being reviewed. You can resubmit once feedback arrives.");
  if (latest?.status === "APPROVED") throw AppError.conflict("This assignment is already approved.");

  const reuseDraft = latest?.status === "DRAFT";
  const attempt = latest ? (reuseDraft ? latest.attempt : latest.attempt + 1) : 1;
  const data = { kind: params.kind, text: params.text?.trim() || null, url: params.url || null, status: params.submit ? ("SUBMITTED" as const) : ("DRAFT" as const), submittedAt: params.submit ? now : null, isLate: params.submit && isLate, attempt, enrollmentId: enrollment.id };

  const submission = await prisma.$transaction(async (tx) => {
    const s = reuseDraft ? await tx.assignmentSubmission.update({ where: { id: latest!.id }, data }) : await tx.assignmentSubmission.create({ data: { ...data, assignmentId: assignment.id, studentId: params.studentId } });
    await tx.submissionFile.deleteMany({ where: { submissionId: s.id } });
    if (params.mediaIds.length) await tx.submissionFile.createMany({ data: params.mediaIds.map((mediaId) => ({ submissionId: s.id, mediaId })) });
    return s;
  });
  await touchStreak(params.userId);
  return submission;
}

export interface GradeInput {
  submissionId: string;
  decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED";
  score?: number | null;
  feedback?: string;
  rubricScores: Array<{ criterionId: string; points: number; comment?: string }>;
}

export async function gradeSubmission(input: GradeInput, reviewerId: string) {
  const submission = await prisma.assignmentSubmission.findUnique({ where: { id: input.submissionId }, include: { assignment: { include: { rubric: { include: { criteria: true } } } }, student: { select: { userId: true } } } });
  if (!submission) throw AppError.notFound("Submission");
  if (!["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"].includes(submission.status)) throw AppError.conflict("This submission isn't awaiting review.");

  let score = input.score ?? null;
  if (input.rubricScores.length && submission.assignment.rubric) {
    const max = submission.assignment.rubric.criteria.reduce((s, c) => s + Number(c.maxPoints), 0);
    const got = input.rubricScores.reduce((s, r) => s + r.points, 0);
    score = max ? Math.round((got / max) * Number(submission.assignment.maxPoints) * 100) / 100 : got;
  }
  if (score != null && submission.isLate && submission.assignment.latePenaltyPercent > 0) {
    score = Math.round(score * (1 - submission.assignment.latePenaltyPercent / 100) * 100) / 100;
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.rubricScore.deleteMany({ where: { submissionId: submission.id } });
    if (input.rubricScores.length) await tx.rubricScore.createMany({ data: input.rubricScores.map((r) => ({ submissionId: submission.id, criterionId: r.criterionId, points: r.points, comment: r.comment || null })) });
    if (input.feedback?.trim()) await tx.assignmentFeedback.create({ data: { submissionId: submission.id, authorId: reviewerId, body: input.feedback.trim() } });
    return tx.assignmentSubmission.update({ where: { id: submission.id }, data: { status: input.decision, score, reviewedAt: new Date(), reviewedById: reviewerId } });
  });

  await notify({
    userId: submission.student.userId,
    event: "SYSTEM",
    data: { assignment: submission.assignment.title },
    href: `/student/assignments/${submission.assignmentId}`,
    fallback: {
      title: input.decision === "APPROVED" ? `Approved: ${submission.assignment.title}` : input.decision === "REVISION_REQUESTED" ? `Revision requested: ${submission.assignment.title}` : `Feedback on ${submission.assignment.title}`,
      body: input.feedback?.trim() || (input.decision === "APPROVED" ? `Great work${score != null ? ` — you scored ${score}/${submission.assignment.maxPoints}` : ""}.` : "Open the assignment to read your instructor's notes."),
    },
  });

  if (input.decision === "APPROVED") {
    if (submission.enrollmentId) await evaluateAndCompleteIfReady(submission.enrollmentId);
    const firstTryApprovals = await prisma.assignmentSubmission.count({ where: { studentId: submission.studentId, status: "APPROVED", attempt: 1 } });
    if (firstTryApprovals >= 5) await awardBadge(submission.student.userId, "ASSIGNMENT_MASTER");
  }
  return updated;
}

export interface SubmissionQueueFilters {
  instructorId?: string | null;
  courseId?: string;
  status?: "SUBMITTED" | "UNDER_REVIEW" | "REVISION_REQUESTED" | "APPROVED" | "REJECTED" | "DRAFT";
  page?: number;
  pageSize?: number;
}

/** Review queue scoped to the instructor's courses (or all for academic managers). */
export async function listSubmissions(filters: SubmissionQueueFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where: Prisma.AssignmentSubmissionWhereInput = {
    status: filters.status ?? { in: ["SUBMITTED", "UNDER_REVIEW"] },
    ...(filters.courseId ? { assignment: { courseId: filters.courseId } } : {}),
    ...(filters.instructorId ? { assignment: { course: { instructors: { some: { instructorId: filters.instructorId } } } } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.assignmentSubmission.findMany({ where, orderBy: { submittedAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize, include: { assignment: { select: { id: true, title: true, maxPoints: true, dueAt: true, course: { select: { id: true, title: true } } } }, student: { select: { id: true, studentNumber: true, user: { select: { name: true, avatar: { select: { url: true } } } } } } } }),
    prisma.assignmentSubmission.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getSubmissionForReview(submissionId: string) {
  const s = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { rubric: { include: { criteria: { orderBy: { order: "asc" } } } }, course: { select: { id: true, title: true, instructors: { select: { instructorId: true } } } } } },
      student: { select: { id: true, studentNumber: true, user: { select: { name: true, email: true, avatar: { select: { url: true } } } } } },
      files: { include: { media: true } },
      feedback: { orderBy: { createdAt: "asc" } },
      rubricScores: true,
      reviewedBy: { select: { name: true } },
    },
  });
  if (!s) throw AppError.notFound("Submission");
  return s;
}

export async function rubricsList() {
  return prisma.rubric.findMany({ orderBy: { title: "asc" }, include: { criteria: { orderBy: { order: "asc" } } } });
}

export async function upsertRubric(input: { id?: string; title: string; description?: string; criteria: Array<{ id?: string; title: string; description?: string; maxPoints: number }> }) {
  if (input.id) {
    return prisma.$transaction(async (tx) => {
      await tx.rubricCriterion.deleteMany({ where: { rubricId: input.id, NOT: { id: { in: input.criteria.map((c) => c.id).filter(Boolean) as string[] } } } });
      for (const [i, c] of input.criteria.entries()) {
        if (c.id) await tx.rubricCriterion.update({ where: { id: c.id }, data: { title: c.title, description: c.description || null, maxPoints: c.maxPoints, order: i } });
        else await tx.rubricCriterion.create({ data: { rubricId: input.id!, title: c.title, description: c.description || null, maxPoints: c.maxPoints, order: i } });
      }
      return tx.rubric.update({ where: { id: input.id }, data: { title: input.title, description: input.description || null } });
    });
  }
  return prisma.rubric.create({ data: { title: input.title, description: input.description || null, criteria: { create: input.criteria.map((c, i) => ({ title: c.title, description: c.description || null, maxPoints: c.maxPoints, order: i })) } } });
}
