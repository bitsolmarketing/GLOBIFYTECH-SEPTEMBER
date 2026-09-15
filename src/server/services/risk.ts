import "server-only";
import { prisma } from "@/server/db/prisma";
import { scoreRisk, type RiskSignals, type RiskThresholds } from "@/lib/risk";
import { getSetting } from "./settings";
import { notify, notifyRole } from "./notifications";
import { toNumber } from "@/lib/utils";

async function thresholds(): Promise<RiskThresholds> {
  const [inactiveDaysMedium, inactiveDaysHigh, attendanceWarning, attendanceCritical] = await Promise.all([
    getSetting("risk.inactiveDaysMedium"),
    getSetting("risk.inactiveDaysHigh"),
    getSetting("attendance.warningPercent"),
    getSetting("attendance.criticalPercent"),
  ]);
  return { inactiveDaysMedium, inactiveDaysHigh, attendanceWarning, attendanceCritical };
}

/** Collects live signals for one active enrollment. */
export async function collectSignals(enrollmentId: string): Promise<{ signals: RiskSignals; studentId: string; userId: string; courseTitle: string } | null> {
  const e = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      student: { select: { id: true, userId: true } },
      course: { select: { title: true, assignments: { where: { isPublished: true, dueAt: { lt: new Date() } }, select: { id: true } } } },
      batch: { select: { startDate: true, endDate: true } },
      progress: true,
      quizAttempts: { where: { status: "GRADED" }, select: { percent: true, passed: true } },
      submissions: { select: { assignmentId: true, status: true } },
    },
  });
  if (!e || e.status !== "ACTIVE") return null;
  const now = Date.now();
  const lastActivity = e.progress?.lastActivityAt ?? e.startedAt;
  const daysInactive = Math.floor((now - lastActivity.getTime()) / 86400000);

  const att = e.batchId ? await prisma.attendance.groupBy({ by: ["status"], where: { batchId: e.batchId, studentId: e.studentId }, _count: { _all: true } }) : [];
  const attTotal = att.reduce((s, r) => s + r._count._all, 0);
  const attPresent = att.filter((r) => r.status !== "ABSENT").reduce((s, r) => s + r._count._all, 0);

  const dueIds = new Set(e.course.assignments.map((a) => a.id));
  const submitted = new Set(e.submissions.filter((s) => s.status !== "DRAFT").map((s) => s.assignmentId));
  const missed = [...dueIds].filter((id) => !submitted.has(id)).length;

  const week = await prisma.learningActivity.aggregate({ where: { userId: e.student.userId, date: { gte: new Date(now - 7 * 86400000) } }, _sum: { seconds: true } });
  const overdue = await prisma.invoice.count({ where: { enrollmentId: e.id, status: "OVERDUE", deletedAt: null } });

  let expected: number | null = null;
  if (e.batch?.startDate && e.batch.endDate) {
    const span = e.batch.endDate.getTime() - e.batch.startDate.getTime();
    expected = span > 0 ? Math.min(100, Math.max(0, ((now - e.batch.startDate.getTime()) / span) * 100)) : null;
  }

  const quizAvg = e.quizAttempts.length ? e.quizAttempts.reduce((s, a) => s + toNumber(a.percent), 0) / e.quizAttempts.length : null;
  return {
    studentId: e.student.id,
    userId: e.student.userId,
    courseTitle: e.course.title,
    signals: {
      daysInactive,
      attendancePercent: attTotal ? (attPresent / attTotal) * 100 : null,
      missedAssignments: missed,
      totalAssignmentsDue: dueIds.size,
      avgQuizPercent: quizAvg,
      quizzesFailed: e.quizAttempts.filter((a) => !a.passed).length,
      progressPercent: toNumber(e.progress?.percent ?? 0),
      expectedProgressPercent: expected,
      learningMinutesLast7Days: Math.round((week._sum.seconds ?? 0) / 60),
      overdueInvoices: overdue,
    },
  };
}

export async function computeRiskForEnrollment(enrollmentId: string) {
  const data = await collectSignals(enrollmentId);
  if (!data) return null;
  const result = scoreRisk(data.signals, await thresholds());
  const row = await prisma.studentRiskScore.create({ data: { studentId: data.studentId, enrollmentId, score: result.score, level: result.level, reasons: result.reasons, recommendation: result.recommendation, signals: data.signals as never } });
  if (result.level === "HIGH") {
    const recent = await prisma.studentRiskScore.findFirst({ where: { studentId: data.studentId, enrollmentId, level: "HIGH", computedAt: { gte: new Date(Date.now() - 7 * 86400000) }, NOT: { id: row.id } } });
    if (!recent) {
      await notifyRole(["COUNSELLOR", "ACADEMIC_MANAGER"], { event: "RISK_ALERT", data: { course: data.courseTitle, reasons: result.reasons.join(", ") }, href: `/admin/students/${data.studentId}`, fallback: { title: `At-risk student in ${data.courseTitle}`, body: result.reasons.join(" · ") } });
      await notify({ userId: data.userId, event: "SYSTEM", data: {}, href: "/student/dashboard", fallback: { title: "Let's get you back on track", body: "You've been away for a bit. Your next lesson is waiting — even 15 minutes today keeps your streak alive." }, channels: ["IN_APP"] });
    }
  }
  return row;
}

/** Job: recompute for every active enrollment (or one student). */
export async function computeAllRisk(studentId?: string) {
  const enrollments = await prisma.enrollment.findMany({ where: { status: "ACTIVE", ...(studentId ? { studentId } : {}) }, select: { id: true } });
  let high = 0;
  for (const e of enrollments) {
    const r = await computeRiskForEnrollment(e.id);
    if (r?.level === "HIGH") high++;
  }
  return { processed: enrollments.length, high };
}

export async function latestRiskScores(filters: { level?: "LOW" | "MEDIUM" | "HIGH"; page?: number; pageSize?: number }) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  // Latest score per enrollment
  const rows = await prisma.studentRiskScore.findMany({ where: { computedAt: { gte: new Date(Date.now() - 14 * 86400000) }, ...(filters.level ? { level: filters.level } : {}) }, orderBy: { computedAt: "desc" }, distinct: ["enrollmentId"], include: { student: { select: { id: true, studentNumber: true, user: { select: { name: true, email: true, avatar: { select: { url: true } } } } } } } });
  const enrollmentIds = rows.map((r) => r.enrollmentId).filter((x): x is string => !!x);
  const enrollments = await prisma.enrollment.findMany({ where: { id: { in: enrollmentIds } }, select: { id: true, course: { select: { title: true } }, batch: { select: { code: true } } } });
  const map = new Map(enrollments.map((e) => [e.id, e]));
  const sorted = rows.sort((a, b) => b.score - a.score);
  return { items: sorted.slice((page - 1) * pageSize, page * pageSize).map((r) => ({ ...r, enrollment: r.enrollmentId ? map.get(r.enrollmentId) : undefined })), total: sorted.length, page, pageSize };
}

export async function acknowledgeRisk(id: string, userId: string) {
  return prisma.studentRiskScore.update({ where: { id }, data: { acknowledgedById: userId, acknowledgedAt: new Date() } });
}
