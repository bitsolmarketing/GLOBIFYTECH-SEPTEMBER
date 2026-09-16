import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, ExternalLink, Users, Layers, Wallet, Star } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getCourseForEditing } from "@/server/services/courses";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { enumLabel, formatDate, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Course" };
export const dynamic = "force-dynamic";

export default async function AdminCourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("courses.read")]);
  const course = await getCourseForEditing(id);
  const [enrollmentStats, revenue, batches, feePlans] = await Promise.all([
    prisma.enrollment.groupBy({ by: ["status"], where: { courseId: id }, _count: { _all: true } }),
    prisma.payment.aggregate({ where: { status: "SUCCEEDED", invoice: { enrollment: { courseId: id } } }, _sum: { amount: true } }),
    prisma.batch.findMany({ where: { courseId: id, deletedAt: null }, orderBy: { startDate: "desc" }, take: 10, include: { instructor: { select: { user: { select: { name: true } } } }, _count: { select: { students: { where: { leftAt: null } } } } } }),
    prisma.feePlan.findMany({ where: { courseId: id }, include: { installments: { orderBy: { order: "asc" } }, _count: { select: { invoices: true } } } }),
  ]);
  const lessons = course.modules.flatMap((m) => m.units.flatMap((u) => u.lessons));
  const active = enrollmentStats.find((s) => s.status === "ACTIVE")?._count._all ?? 0;
  const completed = enrollmentStats.find((s) => s.status === "COMPLETED")?._count._all ?? 0;
  const totalEnrolled = enrollmentStats.reduce((s, x) => s + x._count._all, 0);
  const rule = course.completionRules[0] ?? null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.title }]}
        title={course.title}
        description={`${course.category?.name ?? "Uncategorised"} · ${enumLabel(course.level)} · ${enumLabel(course.mode)}${course.durationWeeks ? ` · ${course.durationWeeks} weeks` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(course.status)}>{enumLabel(course.status)}</Badge>
            {course.status === "PUBLISHED" ? <Button asChild variant="outline" size="sm"><Link href={`/courses/${course.slug}`} target="_blank"><ExternalLink /> View public page</Link></Button> : null}
            {can(user, "courses.update") ? <Button asChild size="sm"><Link href={`/instructor/course/${course.id}`}><Pencil /> Edit in Studio</Link></Button> : null}
          </div>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label="Enrolled" value={totalEnrolled} hint={`${active} active · ${completed} completed`} tone="accent" />
        <StatTile icon={Layers} label="Curriculum" value={`${course.modules.length} modules`} hint={`${lessons.length} lessons`} />
        <StatTile icon={Wallet} label="Revenue" value={formatMoney(toNumber(revenue._sum.amount ?? 0), course.currency)} hint={`List price ${formatMoney(toNumber(course.price), course.currency)}`} tone="success" />
        <StatTile icon={Star} label="Rating" value={course.ratingCount ? `${toNumber(course.ratingAvg).toFixed(1)} ★` : "No ratings"} hint={`${course.ratingCount} reviews`} tone="warning" />
      </section>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <p className="text-h4 mb-3">Curriculum</p>
            {course.modules.length ? (
              <ol className="surface divide-y divide-border">
                {course.modules.map((m, i) => (
                  <li key={m.id} className="px-4 py-3">
                    <p className="text-sm font-medium">{i + 1}. {m.title}</p>
                    <p className="text-caption text-fg-muted">{m.units.length} units · {m.units.reduce((s, u) => s + u.lessons.length, 0)} lessons</p>
                  </li>
                ))}
              </ol>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">No curriculum yet. Build it in the Studio or generate a draft with the AI course builder.</p>}
          </section>
          <section>
            <p className="text-h4 mb-3">Batches</p>
            {batches.length ? (
              <AdminTable headers={["Batch", "Instructor", "Start", { label: "Students", align: "end" }, "Status"]} dense>
                {batches.map((b) => (
                  <Row key={b.id}>
                    <Cell><Link href={`/admin/batches/${b.id}`} className="font-medium hover:text-accent">{b.code}</Link></Cell>
                    <Cell muted>{b.instructor?.user.name ?? "—"}</Cell>
                    <Cell className="text-caption text-fg-muted">{formatDate(b.startDate)}</Cell>
                    <Cell align="end">{b._count.students}/{b.capacity}</Cell>
                    <Cell><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge></Cell>
                  </Row>
                ))}
              </AdminTable>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">No batches. <Link href={`/admin/batches/new?course=${course.id}`} className="text-accent hover:underline">Create one</Link> to schedule classes.</p>}
          </section>
          <section className="grid gap-4 md:grid-cols-3">
            <div className="surface p-4"><p className="text-label mb-2 text-fg-subtle">Quizzes</p><ul className="flex flex-col gap-1 text-caption">{course.quizzes.map((q) => <li key={q.id} className="flex justify-between gap-2"><span className="truncate">{q.title}</span><span className="text-fg-subtle">{q._count.questions}q</span></li>)}{!course.quizzes.length ? <li className="text-fg-subtle">None</li> : null}</ul></div>
            <div className="surface p-4"><p className="text-label mb-2 text-fg-subtle">Assignments</p><ul className="flex flex-col gap-1 text-caption">{course.assignments.map((a) => <li key={a.id} className="truncate">{a.title}</li>)}{!course.assignments.length ? <li className="text-fg-subtle">None</li> : null}</ul></div>
            <div className="surface p-4"><p className="text-label mb-2 text-fg-subtle">Projects</p><ul className="flex flex-col gap-1 text-caption">{course.projects.map((p) => <li key={p.id} className="truncate">{p.title}</li>)}{!course.projects.length ? <li className="text-fg-subtle">None</li> : null}</ul></div>
          </section>
        </div>
        <aside className="flex flex-col gap-4">
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Instructors</p>
            {course.instructors.length ? <ul className="flex flex-col gap-1 text-sm">{course.instructors.map((i) => <li key={i.instructorId}><Link href={`/admin/instructors/${i.instructorId}`} className="hover:text-accent">{i.instructor.user.name}</Link>{i.isLead ? <Badge variant="accent" className="ms-1">Lead</Badge> : null}</li>)}</ul> : <p className="text-caption text-fg-subtle">Not assigned.</p>}
          </div>
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Enrollment breakdown</p>
            <ul className="flex flex-col gap-2 text-sm">
              {enrollmentStats.map((s) => <li key={s.status}><div className="flex justify-between"><span>{enumLabel(s.status)}</span><span className="tabular-nums">{s._count._all}</span></div><Progress value={totalEnrolled ? (s._count._all / totalEnrolled) * 100 : 0} size="sm" className="mt-1" /></li>)}
              {!enrollmentStats.length ? <li className="text-caption text-fg-subtle">No enrollments yet.</li> : null}
            </ul>
          </div>
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Fee plans</p>
            {feePlans.length ? <ul className="flex flex-col gap-2 text-sm">{feePlans.map((f) => <li key={f.id}><span className="font-medium">{f.name}</span>{f.isDefault ? <Badge variant="accent" className="ms-1">Default</Badge> : null}<span className="block text-caption text-fg-muted">{formatMoney(toNumber(f.totalAmount), f.currency)} · {f.installments.length || 1} payment{(f.installments.length || 1) > 1 ? "s" : ""} · {f._count.invoices} invoices</span></li>)}</ul> : <p className="text-caption text-fg-subtle">No fee plan. Enrollments cannot be invoiced automatically.</p>}
          </div>
          {rule ? <div className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Completion rule</p><ul className="flex flex-col gap-1 text-caption text-fg-muted"><li>{rule.requireAllLessons ? "Every lesson must be completed" : "Lesson completion tracked"}</li>{rule.minQuizPercent ? <li>Quiz average {rule.minQuizPercent}%</li> : null}{rule.minExamPercent ? <li>Exam score {rule.minExamPercent}%</li> : null}{rule.requireProjects ? <li>All projects approved</li> : null}{rule.minAttendancePercent ? <li>Attendance {rule.minAttendancePercent}%</li> : null}{rule.requirePaymentClear ? <li>Fees fully paid</li> : null}{rule.autoIssueCertificate ? <li>Certificate issued automatically</li> : null}</ul></div> : null}
        </aside>
      </div>
    </div>
  );
}
