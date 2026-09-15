import "server-only";
import { prisma, type Prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { sanitizeRichText } from "@/lib/sanitize";
import type { ProjectInput } from "@/lib/validation/assessment";
import { requireEnrollment } from "./enrollments";
import { notify } from "./notifications";
import { touchStreak } from "./progress";
import { evaluateAndCompleteIfReady } from "./completion";
import { awardBadge } from "./gamification";
import { ensurePortfolio } from "./career";

function projectData(input: ProjectInput) {
  return {
    courseId: input.courseId,
    title: input.title,
    overview: input.overview || null,
    requirements: input.requirements ? sanitizeRichText(input.requirements) : null,
    skills: input.skills,
    resources: input.resources as never,
    deadline: input.deadline ?? null,
    maxPoints: input.maxPoints,
    rubricId: input.rubricId ?? null,
    addToPortfolio: input.addToPortfolio,
    isPublished: input.isPublished,
  };
}

export async function createProject(input: ProjectInput) {
  const count = await prisma.project.count({ where: { courseId: input.courseId } });
  return prisma.project.create({ data: { ...projectData(input), order: count, milestones: { create: input.milestones.map((m, i) => ({ title: m.title, description: m.description || null, dueAt: m.dueAt ?? null, order: i })) } } });
}

export async function updateProject(id: string, input: ProjectInput) {
  return prisma.$transaction(async (tx) => {
    const keep = input.milestones.map((m) => m.id).filter(Boolean) as string[];
    await tx.projectMilestone.deleteMany({ where: { projectId: id, NOT: { id: { in: keep } } } });
    for (const [i, m] of input.milestones.entries()) {
      if (m.id) await tx.projectMilestone.update({ where: { id: m.id }, data: { title: m.title, description: m.description || null, dueAt: m.dueAt ?? null, order: i } });
      else await tx.projectMilestone.create({ data: { projectId: id, title: m.title, description: m.description || null, dueAt: m.dueAt ?? null, order: i } });
    }
    return tx.project.update({ where: { id }, data: projectData(input) });
  });
}

export async function deleteProject(id: string) {
  return prisma.project.delete({ where: { id } });
}

export async function projectsForStudent(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { courseId: true } });
  const projects = await prisma.project.findMany({
    where: { courseId: { in: enrollments.map((e) => e.courseId) }, isPublished: true },
    orderBy: [{ deadline: "asc" }, { order: "asc" }],
    include: { course: { select: { id: true, title: true } }, milestones: { orderBy: { order: "asc" } }, submissions: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return projects.map((p) => ({ ...p, latest: p.submissions[0] ?? null }));
}

export async function getProjectForStudent(projectId: string, studentId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { course: { select: { id: true, title: true } }, milestones: { orderBy: { order: "asc" } }, rubric: { include: { criteria: { orderBy: { order: "asc" } } } } } });
  if (!project || !project.isPublished) throw AppError.notFound("Project");
  await requireEnrollment(studentId, project.courseId);
  const submission = await prisma.projectSubmission.findFirst({ where: { projectId, studentId }, orderBy: { createdAt: "desc" }, include: { files: { include: { media: true } }, feedback: { orderBy: { createdAt: "asc" } }, rubricScores: { include: { criterion: true } }, reviewedBy: { select: { name: true } } } });
  return { project, submission };
}

export async function submitProject(params: { studentId: string; userId: string; projectId: string; title?: string; description?: string; repoUrl?: string; liveUrl?: string; mediaIds: string[]; milestonesDone: string[]; submit: boolean }) {
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project || !project.isPublished) throw AppError.notFound("Project");
  const enrollment = await requireEnrollment(params.studentId, project.courseId);
  const latest = await prisma.projectSubmission.findFirst({ where: { projectId: project.id, studentId: params.studentId }, orderBy: { createdAt: "desc" } });
  if (latest?.status === "APPROVED") throw AppError.conflict("This project is already approved.");
  if (latest && ["SUBMITTED", "UNDER_REVIEW"].includes(latest.status)) throw AppError.conflict("Your project is being reviewed.");
  if (params.submit && !params.repoUrl && !params.liveUrl && !params.mediaIds.length && !params.description?.trim()) throw AppError.validation("Add a link, files or a description before submitting.");

  const data = {
    title: params.title?.trim() || null,
    description: params.description?.trim() || null,
    repoUrl: params.repoUrl || null,
    liveUrl: params.liveUrl || null,
    milestonesDone: params.milestonesDone,
    status: params.submit ? ("SUBMITTED" as const) : ("DRAFT" as const),
    submittedAt: params.submit ? new Date() : null,
    enrollmentId: enrollment.id,
  };
  const reuse = latest && ["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(latest.status);
  const submission = await prisma.$transaction(async (tx) => {
    const s = reuse ? await tx.projectSubmission.update({ where: { id: latest!.id }, data }) : await tx.projectSubmission.create({ data: { ...data, projectId: project.id, studentId: params.studentId } });
    await tx.submissionFile.deleteMany({ where: { projectSubmissionId: s.id } });
    if (params.mediaIds.length) await tx.submissionFile.createMany({ data: params.mediaIds.map((mediaId) => ({ projectSubmissionId: s.id, mediaId })) });
    return s;
  });
  await touchStreak(params.userId);
  return submission;
}

export async function reviewProject(input: { submissionId: string; decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED"; score?: number | null; feedback?: string; rubricScores: Array<{ criterionId: string; points: number; comment?: string }> }, reviewerId: string) {
  const submission = await prisma.projectSubmission.findUnique({ where: { id: input.submissionId }, include: { project: { include: { rubric: { include: { criteria: true } } } }, student: { select: { id: true, userId: true } }, files: { include: { media: true } } } });
  if (!submission) throw AppError.notFound("Submission");
  let score = input.score ?? null;
  if (input.rubricScores.length && submission.project.rubric) {
    const max = submission.project.rubric.criteria.reduce((s, c) => s + Number(c.maxPoints), 0);
    const got = input.rubricScores.reduce((s, r) => s + r.points, 0);
    score = max ? Math.round((got / max) * Number(submission.project.maxPoints) * 100) / 100 : got;
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.rubricScore.deleteMany({ where: { projectSubmissionId: submission.id } });
    if (input.rubricScores.length) await tx.rubricScore.createMany({ data: input.rubricScores.map((r) => ({ projectSubmissionId: submission.id, criterionId: r.criterionId, points: r.points, comment: r.comment || null })) });
    if (input.feedback?.trim()) await tx.projectFeedback.create({ data: { submissionId: submission.id, authorId: reviewerId, body: input.feedback.trim() } });
    return tx.projectSubmission.update({ where: { id: submission.id }, data: { status: input.decision, score, reviewedAt: new Date(), reviewedById: reviewerId } });
  });

  if (input.decision === "APPROVED") {
    if (submission.project.addToPortfolio && !submission.portfolioProjectId) {
      const portfolio = await ensurePortfolio(submission.student.id);
      const cover = submission.files.find((f) => f.media.kind === "IMAGE")?.mediaId ?? null;
      const count = await prisma.portfolioProject.count({ where: { portfolioId: portfolio.id } });
      const pp = await prisma.portfolioProject.create({
        data: { portfolioId: portfolio.id, title: submission.title || submission.project.title, description: submission.description ?? submission.project.overview, repoUrl: submission.repoUrl, liveUrl: submission.liveUrl, skills: submission.project.skills, coverMediaId: cover, order: count },
      });
      await prisma.projectSubmission.update({ where: { id: submission.id }, data: { portfolioProjectId: pp.id } });
    }
    await awardBadge(submission.student.userId, "PROJECT_COMPLETED", { projectId: submission.projectId });
    if (submission.enrollmentId) await evaluateAndCompleteIfReady(submission.enrollmentId);
  }
  await notify({
    userId: submission.student.userId,
    event: "SYSTEM",
    data: { project: submission.project.title },
    href: `/student/projects/${submission.projectId}`,
    fallback: { title: input.decision === "APPROVED" ? `Project approved: ${submission.project.title}` : `Feedback on ${submission.project.title}`, body: input.feedback?.trim() || (input.decision === "APPROVED" ? "It's now in your portfolio." : "Open the project to read the notes.") },
  });
  return updated;
}

export async function listProjectSubmissions(filters: { instructorId?: string | null; courseId?: string; status?: string; page?: number; pageSize?: number }) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where: Prisma.ProjectSubmissionWhereInput = {
    status: (filters.status as never) ?? { in: ["SUBMITTED", "UNDER_REVIEW"] },
    ...(filters.courseId ? { project: { courseId: filters.courseId } } : {}),
    ...(filters.instructorId ? { project: { course: { instructors: { some: { instructorId: filters.instructorId } } } } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.projectSubmission.findMany({ where, orderBy: { submittedAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize, include: { project: { select: { id: true, title: true, maxPoints: true, course: { select: { id: true, title: true } } } }, student: { select: { id: true, user: { select: { name: true, avatar: { select: { url: true } } } } } } } }),
    prisma.projectSubmission.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export async function getProjectSubmissionForReview(id: string) {
  const s = await prisma.projectSubmission.findUnique({ where: { id }, include: { project: { include: { rubric: { include: { criteria: { orderBy: { order: "asc" } } } }, milestones: { orderBy: { order: "asc" } }, course: { select: { id: true, title: true, instructors: { select: { instructorId: true } } } } } }, student: { select: { id: true, studentNumber: true, user: { select: { name: true, email: true, avatar: { select: { url: true } } } } } }, files: { include: { media: true } }, feedback: { orderBy: { createdAt: "asc" } }, rubricScores: true } });
  if (!s) throw AppError.notFound("Submission");
  return s;
}
