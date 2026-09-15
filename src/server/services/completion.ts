import "server-only";
import { prisma } from "@/server/db/prisma";
import { evaluateCompletion, type CompletionEvaluation, type CompletionSnapshot } from "@/lib/completion";
import { issueCertificate } from "./certificates";
import { awardBadge } from "./gamification";
import { notify } from "./notifications";
import { recomputeCourseStats } from "./courses";

/** Builds the snapshot the pure engine needs from live data. */
export async function buildCompletionSnapshot(enrollmentId: string): Promise<{ snapshot: CompletionSnapshot; rules: NonNullable<Awaited<ReturnType<typeof prisma.courseCompletionRule.findUnique>>> ; enrollment: { id: string; studentId: string; courseId: string; batchId: string | null } }> {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { id: true, studentId: true, courseId: true, batchId: true, progress: { select: { lessonsCompleted: true, lessonsTotal: true } } },
  });
  const rules =
    (await prisma.courseCompletionRule.findUnique({ where: { courseId: enrollment.courseId } })) ??
    (await prisma.courseCompletionRule.create({ data: { courseId: enrollment.courseId } }));

  const [quizzes, exams, projects, attendanceAgg, invoices] = await Promise.all([
    prisma.quiz.findMany({ where: { courseId: enrollment.courseId, isPublished: true }, select: { id: true, attempts: { where: { studentId: enrollment.studentId, status: "GRADED" }, select: { percent: true } } } }),
    prisma.exam.findMany({ where: { courseId: enrollment.courseId, isPublished: true, OR: [{ batchId: null }, { batchId: enrollment.batchId ?? undefined }] }, select: { id: true, attempts: { where: { studentId: enrollment.studentId, status: "GRADED" }, select: { percent: true } } } }),
    prisma.project.findMany({ where: { courseId: enrollment.courseId, isPublished: true }, select: { id: true, submissions: { where: { studentId: enrollment.studentId, status: "APPROVED" }, select: { id: true } } } }),
    enrollment.batchId
      ? prisma.attendance.groupBy({ by: ["status"], where: { batchId: enrollment.batchId, studentId: enrollment.studentId }, _count: { _all: true } })
      : Promise.resolve([] as Array<{ status: string; _count: { _all: number } }>),
    prisma.invoice.findMany({ where: { enrollmentId, deletedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, select: { id: true } }),
  ]);

  const attTotal = attendanceAgg.reduce((s, r) => s + r._count._all, 0);
  const attPresent = attendanceAgg.filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED").reduce((s, r) => s + r._count._all, 0);

  const snapshot: CompletionSnapshot = {
    lessonsTotal: enrollment.progress?.lessonsTotal ?? 0,
    lessonsCompleted: enrollment.progress?.lessonsCompleted ?? 0,
    attendancePercent: attTotal ? (attPresent / attTotal) * 100 : null,
    quizPercents: quizzes.map((q) => (q.attempts.length ? Math.max(...q.attempts.map((a) => Number(a.percent))) : null)),
    examPercents: exams.map((e) => (e.attempts.length ? Math.max(...e.attempts.map((a) => Number(a.percent))) : null)),
    projectsTotal: projects.length,
    projectsApproved: projects.filter((p) => p.submissions.length > 0).length,
    paymentClear: invoices.length === 0,
  };
  return { snapshot, rules, enrollment: { id: enrollment.id, studentId: enrollment.studentId, courseId: enrollment.courseId, batchId: enrollment.batchId } };
}

export async function evaluateEnrollment(enrollmentId: string): Promise<CompletionEvaluation & { snapshot: CompletionSnapshot }> {
  const { snapshot, rules } = await buildCompletionSnapshot(enrollmentId);
  return { ...evaluateCompletion(rules, snapshot), snapshot };
}

/**
 * Called after any progress-changing event. When requirements are met, marks
 * the enrollment complete (once), awards the badge and issues the certificate
 * if the course is configured to.
 */
export async function evaluateAndCompleteIfReady(enrollmentId: string): Promise<{ completed: boolean; certificateId?: string }> {
  const existing = await prisma.courseCompletion.findUnique({ where: { enrollmentId } });
  if (existing) return { completed: true };
  const { snapshot, rules, enrollment } = await buildCompletionSnapshot(enrollmentId);
  const evaluation = evaluateCompletion(rules, snapshot);
  if (!evaluation.complete || snapshot.lessonsTotal === 0) return { completed: false };

  await prisma.$transaction([
    prisma.courseCompletion.create({
      data: {
        enrollmentId,
        finalPercent: snapshot.quizPercents.filter((p): p is number => p != null).length
          ? snapshot.quizPercents.filter((p): p is number => p != null).reduce((a, b) => a + b, 0) / snapshot.quizPercents.filter((p) => p != null).length
          : null,
        attendancePercent: snapshot.attendancePercent,
        evaluation: evaluation as never,
      },
    }),
    prisma.enrollment.update({ where: { id: enrollmentId }, data: { status: "COMPLETED", completedAt: new Date() } }),
  ]);
  await recomputeCourseStats(enrollment.courseId);

  const student = await prisma.studentProfile.findUnique({ where: { id: enrollment.studentId }, select: { userId: true } });
  if (student) await awardBadge(student.userId, "COURSE_COMPLETED", { courseId: enrollment.courseId });

  let certificateId: string | undefined;
  if (rules.autoIssueCertificate) {
    const cert = await issueCertificate({ enrollmentId, validityMonths: rules.certificateValidityMonths });
    certificateId = cert.id;
  } else if (student) {
    const course = await prisma.course.findUnique({ where: { id: enrollment.courseId }, select: { title: true } });
    await notify({ userId: student.userId, event: "SYSTEM", data: { course: course?.title ?? "" }, href: "/student/certificates", fallback: { title: `You completed ${course?.title}`, body: "Congratulations. Your certificate will be issued after review." } });
  }
  return { completed: true, certificateId };
}
