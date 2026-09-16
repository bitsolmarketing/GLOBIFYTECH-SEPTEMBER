import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Users, BookOpen, Video, UserCheck, ArrowRight, AlertTriangle } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { instructorAnalytics } from "@/server/services/analytics";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, greeting, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Instructor dashboard" };
export const dynamic = "force-dynamic";

export default async function InstructorDashboard() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const [courseCount, studentCount, pendingSubs, pendingProjects, upcoming, recentSubs, analytics] = await Promise.all([
    prisma.course.count({ where: { deletedAt: null, ...scope.courseWhere } }),
    prisma.enrollment.count({ where: { status: "ACTIVE", course: scope.courseWhere } }),
    prisma.assignmentSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, assignment: { course: scope.courseWhere } } }),
    prisma.projectSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, project: { course: scope.courseWhere } } }),
    prisma.liveClass.findMany({ where: { status: "SCHEDULED", startsAt: { gte: new Date() }, course: scope.courseWhere }, orderBy: { startsAt: "asc" }, take: 4, include: { course: { select: { title: true } }, batch: { select: { name: true } } } }),
    prisma.assignmentSubmission.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, assignment: { course: scope.courseWhere } }, orderBy: { submittedAt: "asc" }, take: 6, include: { assignment: { select: { title: true } }, student: { select: { user: { select: { name: true } } } } } }),
    scope.instructorId ? instructorAnalytics(scope.instructorId) : null,
  ]);
  const inactive = analytics?.courses.reduce((s, c) => s + c.inactive7d, 0) ?? 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Good ${greeting()}, ${user.name.split(" ")[0]}.`} description="Here's what needs your attention today." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatTile icon={Inbox} label="To grade" value={pendingSubs + pendingProjects} tone={pendingSubs + pendingProjects > 0 ? "warning" : "success"} />
        <StatTile icon={Users} label="Active students" value={studentCount} tone="accent" />
        <StatTile icon={BookOpen} label="Courses" value={courseCount} />
        <StatTile icon={Video} label="Upcoming classes" value={upcoming.length} />
        <StatTile icon={AlertTriangle} label="Inactive 7 days" value={inactive} tone={inactive > 0 ? "warning" : "default"} />
      </div>
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-3 lg:col-span-7">
          <div className="flex items-end justify-between">
            <h2 className="text-h4">Grading queue</h2>
            <Link href="/instructor/submissions" className="text-body-sm text-accent hover:underline">Open queue</Link>
          </div>
          {recentSubs.length ? (
            <ul className="surface divide-y divide-border">
              {recentSubs.map((s) => (
                <li key={s.id}>
                  <Link href={`/instructor/submissions/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-bg-subtle">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.assignment.title}</p>
                      <p className="text-caption text-fg-muted">{s.student.user.name} · submitted {s.submittedAt ? relativeTime(s.submittedAt) : ""}{s.isLate ? " · late" : ""}</p>
                    </div>
                    <Button size="sm" variant="secondary">Grade <ArrowRight className="rtl:rotate-180" /></Button>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<Inbox />} title="You're all caught up." description="No submissions waiting for review." />
          )}
        </section>
        <aside className="flex flex-col gap-3 lg:col-span-5">
          <div className="flex items-end justify-between">
            <h2 className="text-h4">Upcoming classes</h2>
            <Link href="/instructor/live-classes" className="text-body-sm text-accent hover:underline">Schedule</Link>
          </div>
          {upcoming.length ? (
            <ul className="surface divide-y divide-border">
              {upcoming.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><Video className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-caption text-fg-muted">{c.course.title}{c.batch ? ` · ${c.batch.name}` : ""} · {formatDateTime(c.startsAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<Video />} title="No classes scheduled." action={<Button asChild size="sm" variant="secondary"><Link href="/instructor/live-classes?new=1">Schedule one</Link></Button>} />
          )}
          {analytics?.batches.length ? (
            <div className="surface flex flex-col gap-2 p-4">
              <p className="inline-flex items-center gap-2 text-label text-fg-subtle"><UserCheck className="size-3.5" /> Batch attendance</p>
              {analytics.batches.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <Link href={`/instructor/batches/${b.id}`} className="truncate hover:text-accent">{b.name}</Link>
                  <Badge variant={b.attendanceRate == null ? "default" : b.attendanceRate >= 75 ? "success" : "warning"}>{b.attendanceRate == null ? "no data" : `${b.attendanceRate}%`}</Badge>
                </div>
              ))}
            </div>
          ) : null}
        </aside>
      </div>
      {analytics?.courses.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-h4">Your courses</h2>
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-label text-fg-subtle"><tr><th className="p-3 text-start">Course</th><th className="p-3 text-end">Students</th><th className="p-3 text-end">Avg progress</th><th className="p-3 text-end">Inactive 7d</th><th className="p-3 text-end">Rating</th></tr></thead>
              <tbody className="divide-y divide-border">
                {analytics.courses.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-subtle/60">
                    <td className="p-3"><Link href={`/instructor/course/${c.id}`} className="font-medium hover:text-accent">{c.title}</Link></td>
                    <td className="p-3 text-end tabular-nums">{c.students}</td>
                    <td className="p-3 text-end tabular-nums">{c.avgProgress}%</td>
                    <td className="p-3 text-end tabular-nums">{c.inactive7d}</td>
                    <td className="p-3 text-end tabular-nums">{toNumber(c.rating) ? toNumber(c.rating).toFixed(1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
