import "server-only";
import { prisma } from "@/server/db/prisma";
import { toNumber } from "@/lib/utils";

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - offset, 1);
}

export interface Series {
  date: string;
  value: number;
}

function bucketByDay<T>(rows: T[], getDate: (r: T) => Date | null | undefined, getValue: (r: T) => number, days: number): Series[] {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) map.set(daysAgo(i).toISOString().slice(0, 10), 0);
  for (const r of rows) {
    const d = getDate(r);
    if (!d) continue;
    const key = d.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + getValue(r));
  }
  return [...map.entries()].map(([date, value]) => ({ date, value }));
}

// ───────────── Admin ─────────────

export async function adminOverview() {
  const since30 = daysAgo(30);
  const prev30 = daysAgo(60);
  const [students, newStudents, prevNewStudents, activeEnrollments, completions, revenueMonth, revenuePrevMonth, leads, leadsPrev, enrolledLeads, atRisk, pendingApplications, unpaidInvoices, upcomingClasses, paymentsSeries, enrollmentSeries, topCourses, leadFunnel] = await Promise.all([
    prisma.studentProfile.count(),
    prisma.studentProfile.count({ where: { createdAt: { gte: since30 } } }),
    prisma.studentProfile.count({ where: { createdAt: { gte: prev30, lt: since30 } } }),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.courseCompletion.count({ where: { completedAt: { gte: since30 } } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: monthStart() } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", paidAt: { gte: monthStart(1), lt: monthStart() } }, _sum: { amount: true } }),
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: since30 } } }),
    prisma.lead.count({ where: { deletedAt: null, createdAt: { gte: prev30, lt: since30 } } }),
    prisma.lead.count({ where: { deletedAt: null, stage: "ENROLLED", updatedAt: { gte: since30 } } }),
    prisma.studentRiskScore.count({ where: { level: "HIGH", computedAt: { gte: daysAgo(7) }, acknowledgedAt: null } }),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.invoice.aggregate({ where: { deletedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, _sum: { total: true, amountPaid: true }, _count: { _all: true } }),
    prisma.liveClass.count({ where: { status: "SCHEDULED", startsAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } } }),
    prisma.payment.findMany({ where: { status: "SUCCEEDED", paidAt: { gte: since30 } }, select: { paidAt: true, amount: true } }),
    prisma.enrollment.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
    prisma.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, orderBy: { studentCount: "desc" }, take: 5, select: { id: true, title: true, studentCount: true, ratingAvg: true, _count: { select: { enrollments: { where: { status: "COMPLETED" } } } } } }),
    prisma.lead.groupBy({ by: ["stage"], where: { deletedAt: null, createdAt: { gte: since30 } }, _count: { _all: true } }),
  ]);
  const revenue = toNumber(revenueMonth._sum.amount ?? 0);
  const revenuePrev = toNumber(revenuePrevMonth._sum.amount ?? 0);
  return {
    kpis: {
      students: { value: students, delta: newStudents - prevNewStudents, deltaLabel: `${newStudents} new in 30 days` },
      activeEnrollments: { value: activeEnrollments },
      completions: { value: completions },
      revenue: { value: revenue, delta: revenuePrev ? Math.round(((revenue - revenuePrev) / revenuePrev) * 100) : null },
      leads: { value: leads, delta: leads - leadsPrev, conversion: leads ? Math.round((enrolledLeads / leads) * 100) : 0 },
      atRisk: { value: atRisk },
      pendingApplications: { value: pendingApplications },
      outstanding: { value: toNumber(unpaidInvoices._sum.total ?? 0) - toNumber(unpaidInvoices._sum.amountPaid ?? 0), count: unpaidInvoices._count._all },
      upcomingClasses: { value: upcomingClasses },
    },
    revenueSeries: bucketByDay(paymentsSeries, (p) => p.paidAt, (p) => toNumber(p.amount), 30),
    enrollmentSeries: bucketByDay(enrollmentSeries, (e) => e.createdAt, () => 1, 30),
    topCourses: topCourses.map((c) => ({ id: c.id, title: c.title, students: c.studentCount, rating: toNumber(c.ratingAvg), completed: c._count.enrollments })),
    leadFunnel: ["NEW", "CONTACTED", "COUNSELLING", "INTERESTED", "APPLICATION", "APPROVED", "FEE_PENDING", "ENROLLED"].map((stage) => ({ stage, value: leadFunnel.find((f) => f.stage === stage)?._count._all ?? 0 })),
  };
}

export async function adminAnalytics(days = 90) {
  const since = daysAgo(days);
  const [enrollments, completions, payments, leads, attendance, quizAttempts, submissions, courses, instructors, lessonProgress, dropouts] = await Promise.all([
    prisma.enrollment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true, courseId: true } }),
    prisma.courseCompletion.findMany({ where: { completedAt: { gte: since } }, select: { completedAt: true } }),
    prisma.payment.findMany({ where: { status: "SUCCEEDED", paidAt: { gte: since } }, select: { paidAt: true, amount: true, provider: true } }),
    prisma.lead.findMany({ where: { deletedAt: null, createdAt: { gte: since } }, select: { createdAt: true, source: true, stage: true } }),
    prisma.attendance.groupBy({ by: ["status"], where: { sessionDate: { gte: since } }, _count: { _all: true } }),
    prisma.quizAttempt.findMany({ where: { status: "GRADED", submittedAt: { gte: since } }, select: { percent: true, passed: true, quiz: { select: { courseId: true } } } }),
    prisma.assignmentSubmission.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { id: true, title: true, studentCount: true, ratingAvg: true, enrollments: { select: { status: true, progress: { select: { percent: true } } } } } }),
    prisma.instructorProfile.findMany({ select: { id: true, user: { select: { name: true } }, batches: { select: { _count: { select: { students: { where: { leftAt: null } } } } } }, courses: { select: { course: { select: { ratingAvg: true, ratingCount: true, enrollments: { select: { status: true } } } } } } } }),
    prisma.lessonProgress.count({ where: { status: "COMPLETED", completedAt: { gte: since } } }),
    prisma.enrollment.count({ where: { status: "DROPPED", updatedAt: { gte: since } } }),
  ]);
  const attTotal = attendance.reduce((s, a) => s + a._count._all, 0);
  const attPresent = attendance.filter((a) => a.status !== "ABSENT").reduce((s, a) => s + a._count._all, 0);
  const bySource = Object.entries(leads.reduce<Record<string, number>>((acc, l) => ((acc[l.source] = (acc[l.source] ?? 0) + 1), acc), {})).map(([source, value]) => ({ source, value }));
  const byProvider = Object.entries(payments.reduce<Record<string, number>>((acc, p) => ((acc[p.provider] = (acc[p.provider] ?? 0) + toNumber(p.amount)), acc), {})).map(([provider, value]) => ({ provider, value }));
  return {
    days,
    enrollmentSeries: bucketByDay(enrollments, (e) => e.createdAt, () => 1, days),
    completionSeries: bucketByDay(completions, (c) => c.completedAt, () => 1, days),
    revenueSeries: bucketByDay(payments, (p) => p.paidAt, (p) => toNumber(p.amount), days),
    leadSeries: bucketByDay(leads, (l) => l.createdAt, () => 1, days),
    leadsBySource: bySource,
    revenueByProvider: byProvider,
    attendanceRate: attTotal ? Math.round((attPresent / attTotal) * 100) : null,
    quiz: { attempts: quizAttempts.length, avgPercent: quizAttempts.length ? Math.round(quizAttempts.reduce((s, a) => s + toNumber(a.percent), 0) / quizAttempts.length) : null, passRate: quizAttempts.length ? Math.round((quizAttempts.filter((a) => a.passed).length / quizAttempts.length) * 100) : null },
    assignments: submissions.map((s) => ({ status: s.status, value: s._count._all })),
    lessonsCompleted: lessonProgress,
    dropouts,
    courses: courses
      .map((c) => {
        const active = c.enrollments.filter((e) => e.status === "ACTIVE" || e.status === "COMPLETED");
        const avgProgress = active.length ? Math.round(active.reduce((s, e) => s + toNumber(e.progress?.percent ?? 0), 0) / active.length) : 0;
        const completed = c.enrollments.filter((e) => e.status === "COMPLETED").length;
        return { id: c.id, title: c.title, students: c.studentCount, rating: toNumber(c.ratingAvg), avgProgress, completionRate: active.length ? Math.round((completed / active.length) * 100) : 0 };
      })
      .sort((a, b) => b.students - a.students),
    instructors: instructors.map((i) => {
      const enrollments = i.courses.flatMap((c) => c.course.enrollments);
      const completed = enrollments.filter((e) => e.status === "COMPLETED").length;
      const ratings = i.courses.map((c) => ({ avg: toNumber(c.course.ratingAvg), n: c.course.ratingCount })).filter((r) => r.n > 0);
      const rating = ratings.length ? ratings.reduce((s, r) => s + r.avg * r.n, 0) / ratings.reduce((s, r) => s + r.n, 0) : null;
      return { id: i.id, name: i.user.name, students: i.batches.reduce((s, b) => s + b._count.students, 0), completionRate: enrollments.length ? Math.round((completed / enrollments.length) * 100) : null, rating: rating ? Math.round(rating * 10) / 10 : null };
    }),
  };
}

// ───────────── Instructor ─────────────

export async function instructorAnalytics(instructorId: string) {
  const courses = await prisma.course.findMany({
    where: { deletedAt: null, instructors: { some: { instructorId } } },
    select: { id: true, title: true, studentCount: true, ratingAvg: true, enrollments: { select: { status: true, progress: { select: { percent: true, lastActivityAt: true } } } }, quizzes: { select: { title: true, attempts: { where: { status: "GRADED" }, select: { percent: true, passed: true } } } }, assignments: { select: { title: true, submissions: { select: { status: true } } } } },
  });
  const batches = await prisma.batch.findMany({ where: { instructorId, deletedAt: null, status: { in: ["OPEN", "RUNNING"] } }, select: { id: true, code: true, name: true, attendance: { select: { status: true } }, _count: { select: { students: { where: { leftAt: null } } } } } });
  const pendingGrading = await prisma.assignmentSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, assignment: { course: { instructors: { some: { instructorId } } } } } });
  return {
    pendingGrading,
    courses: courses.map((c) => {
      const active = c.enrollments.filter((e) => e.status === "ACTIVE");
      const inactive = active.filter((e) => !e.progress?.lastActivityAt || e.progress.lastActivityAt < daysAgo(7)).length;
      return {
        id: c.id,
        title: c.title,
        students: c.studentCount,
        rating: toNumber(c.ratingAvg),
        avgProgress: active.length ? Math.round(active.reduce((s, e) => s + toNumber(e.progress?.percent ?? 0), 0) / active.length) : 0,
        inactive7d: inactive,
        quizzes: c.quizzes.map((q) => ({ title: q.title, attempts: q.attempts.length, avg: q.attempts.length ? Math.round(q.attempts.reduce((s, a) => s + toNumber(a.percent), 0) / q.attempts.length) : null, passRate: q.attempts.length ? Math.round((q.attempts.filter((a) => a.passed).length / q.attempts.length) * 100) : null })),
        assignments: c.assignments.map((a) => ({ title: a.title, submitted: a.submissions.filter((s) => s.status !== "DRAFT").length, approved: a.submissions.filter((s) => s.status === "APPROVED").length })),
      };
    }),
    batches: batches.map((b) => {
      const total = b.attendance.length;
      const present = b.attendance.filter((a) => a.status !== "ABSENT").length;
      return { id: b.id, code: b.code, name: b.name, students: b._count.students, attendanceRate: total ? Math.round((present / total) * 100) : null };
    }),
  };
}

// ───────────── Student ─────────────

export async function studentAnalytics(studentId: string, userId: string) {
  const [activity, enrollments, quizzes, streak] = await Promise.all([
    prisma.learningActivity.findMany({ where: { userId, date: { gte: daysAgo(28) } }, orderBy: { date: "asc" } }),
    prisma.enrollment.findMany({ where: { studentId, status: { in: ["ACTIVE", "COMPLETED"] } }, select: { course: { select: { title: true } }, progress: { select: { percent: true, secondsSpent: true } } } }),
    prisma.quizAttempt.findMany({ where: { studentId, status: "GRADED" }, orderBy: { submittedAt: "asc" }, select: { submittedAt: true, percent: true, weakTopics: true, quiz: { select: { title: true } } } }),
    prisma.streak.findUnique({ where: { userId } }),
  ]);
  const weekSeconds = activity.filter((a) => a.date >= daysAgo(7)).reduce((s, a) => s + a.seconds, 0);
  const weakTopics = quizzes.slice(-5).flatMap((q) => q.weakTopics);
  return {
    weeklySeries: bucketByDay(activity, (a) => a.date, (a) => Math.round(a.seconds / 60), 28),
    weekMinutes: Math.round(weekSeconds / 60),
    streak: streak ?? { current: 0, longest: 0 },
    courses: enrollments.map((e) => ({ title: e.course.title, percent: toNumber(e.progress?.percent ?? 0), minutes: Math.round((e.progress?.secondsSpent ?? 0) / 60) })),
    quizTrend: quizzes.map((q) => ({ date: q.submittedAt?.toISOString().slice(0, 10) ?? "", value: toNumber(q.percent), title: q.quiz.title })),
    weakTopics: [...new Set(weakTopics)].slice(0, 6),
  };
}

// ───────────── Exports ─────────────

export type ExportRow = Record<string, string | number | null | undefined>;

export function toCsv(rows: ExportRow[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export async function toExcel(rows: ExportRow[], sheetName = "Report"): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Globify Tech";
  const ws = wb.addWorksheet(sheetName);
  if (rows.length) {
    ws.columns = Object.keys(rows[0]!).map((key) => ({ header: key, key, width: Math.min(40, Math.max(12, key.length + 4)) }));
    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function toPdfTable(title: string, rows: ExportRow[]): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const [bold, regular] = await Promise.all([pdf.embedFont(StandardFonts.HelveticaBold), pdf.embedFont(StandardFonts.Helvetica)]);
  const headers = rows.length ? Object.keys(rows[0]!) : [];
  const colWidth = headers.length ? Math.min(140, (842 - 96) / headers.length) : 100;
  let page = pdf.addPage([842, 595]);
  let y = 540;
  const drawHeader = () => {
    page.drawText(title, { x: 48, y: 560, size: 14, font: bold, color: rgb(0.04, 0.05, 0.07) });
    headers.forEach((h, i) => page.drawText(h.slice(0, 22), { x: 48 + i * colWidth, y, size: 8, font: bold, color: rgb(0.36, 0.39, 0.45) }));
    y -= 16;
  };
  drawHeader();
  for (const row of rows) {
    if (y < 40) {
      page = pdf.addPage([842, 595]);
      y = 540;
      drawHeader();
    }
    headers.forEach((h, i) => page.drawText(String(row[h] ?? "").slice(0, 26), { x: 48 + i * colWidth, y, size: 8, font: regular, color: rgb(0.04, 0.05, 0.07) }));
    y -= 14;
  }
  return Buffer.from(await pdf.save());
}

export type ReportKey = "students" | "enrollments" | "payments" | "leads" | "attendance" | "certificates" | "quiz-performance";

export async function reportRows(key: ReportKey, params: { from?: Date; to?: Date } = {}): Promise<ExportRow[]> {
  const range = { gte: params.from ?? daysAgo(365), lte: params.to ?? new Date() };
  switch (key) {
    case "students":
      return (await prisma.studentProfile.findMany({ where: { createdAt: range }, include: { user: true, campus: true, _count: { select: { enrollments: true, certificates: true } } }, orderBy: { createdAt: "desc" } })).map((s) => ({ "Student #": s.studentNumber, Name: s.user.name, Email: s.user.email, Phone: s.user.phone, City: s.city, Campus: s.campus?.name, Enrollments: s._count.enrollments, Certificates: s._count.certificates, Joined: s.createdAt.toISOString().slice(0, 10) }));
    case "enrollments":
      return (await prisma.enrollment.findMany({ where: { createdAt: range }, include: { student: { include: { user: true } }, course: true, batch: true, progress: true }, orderBy: { createdAt: "desc" } })).map((e) => ({ Student: e.student.user.name, Course: e.course.title, Batch: e.batch?.code, Status: e.status, "Progress %": toNumber(e.progress?.percent ?? 0), Source: e.source, Enrolled: e.createdAt.toISOString().slice(0, 10) }));
    case "payments":
      return (await prisma.payment.findMany({ where: { paidAt: range, status: "SUCCEEDED" }, include: { invoice: { include: { student: { include: { user: true } } } }, receipt: true }, orderBy: { paidAt: "desc" } })).map((p) => ({ Receipt: p.receipt?.number, Invoice: p.invoice.number, Student: p.invoice.student.user.name, Amount: toNumber(p.amount), Currency: p.currency, Provider: p.provider, Paid: p.paidAt?.toISOString().slice(0, 10) }));
    case "leads":
      return (await prisma.lead.findMany({ where: { deletedAt: null, createdAt: range }, include: { course: true, counsellor: true }, orderBy: { createdAt: "desc" } })).map((l) => ({ Name: l.name, Phone: l.phone, Email: l.email, City: l.city, Course: l.course?.title, Source: l.source, Stage: l.stage, Counsellor: l.counsellor?.name, Score: l.score, Created: l.createdAt.toISOString().slice(0, 10) }));
    case "attendance":
      return (await prisma.attendance.findMany({ where: { sessionDate: range }, include: { student: { include: { user: true } }, batch: true }, orderBy: { sessionDate: "desc" } })).map((a) => ({ Date: a.sessionDate.toISOString().slice(0, 10), Batch: a.batch.code, Student: a.student.user.name, Status: a.status, Method: a.method }));
    case "certificates":
      return (await prisma.certificate.findMany({ where: { issuedAt: range }, include: { student: { include: { user: true } }, course: true }, orderBy: { issuedAt: "desc" } })).map((c) => ({ "Certificate #": c.certificateNumber, Student: c.student.user.name, Course: c.course.title, Status: c.status, Issued: c.issuedAt.toISOString().slice(0, 10), Expires: c.expiresAt?.toISOString().slice(0, 10) }));
    case "quiz-performance":
      return (await prisma.quizAttempt.findMany({ where: { status: "GRADED", submittedAt: range }, include: { student: { include: { user: true } }, quiz: { include: { course: true } } }, orderBy: { submittedAt: "desc" } })).map((a) => ({ Student: a.student.user.name, Course: a.quiz.course.title, Quiz: a.quiz.title, Attempt: a.attemptNumber, "Score %": toNumber(a.percent), Passed: a.passed ? "Yes" : "No", "Weak topics": a.weakTopics.join("; "), Date: a.submittedAt?.toISOString().slice(0, 10) }));
  }
}
