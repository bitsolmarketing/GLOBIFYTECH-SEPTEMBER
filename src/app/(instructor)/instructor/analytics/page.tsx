import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { instructorAnalytics } from "@/server/services/analytics";
import { PageHeader } from "@/components/layout/page-header";
import { BarsChart } from "@/components/charts";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

export default async function InstructorAnalyticsPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const data = scope.instructorId ? await instructorAnalytics(scope.instructorId) : null;
  if (!data || !data.courses.length) return <div className="flex flex-col gap-6"><PageHeader title="Analytics" /><EmptyState icon={<BarChart3 />} title="No data yet." description="Analytics appear once students are enrolled in your courses." /></div>;
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Analytics" description="Progress, engagement and assessment performance across your courses." />
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <p className="text-h4 mb-3">Average progress by course</p>
          <BarsChart data={data.courses.map((c) => ({ label: c.title.length > 24 ? `${c.title.slice(0, 23)}…` : c.title, value: c.avgProgress }))} format={(v) => `${v}%`} horizontal height={Math.max(200, data.courses.length * 40)} name="Avg progress" />
        </div>
        <div className="surface p-5">
          <p className="text-h4 mb-3">Inactive students (7 days)</p>
          <BarsChart data={data.courses.map((c) => ({ label: c.title.length > 24 ? `${c.title.slice(0, 23)}…` : c.title, value: c.inactive7d }))} horizontal height={Math.max(200, data.courses.length * 40)} name="Inactive" color="var(--warning)" />
        </div>
      </section>
      {data.courses.map((c) => (
        <section key={c.id} className="surface flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-h4">{c.title}</p><div className="flex gap-2 text-caption"><Badge>{c.students} students</Badge><Badge variant="accent">{c.avgProgress}% avg progress</Badge>{c.rating ? <Badge variant="warning">★ {c.rating.toFixed(1)}</Badge> : null}</div></div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-label mb-2 text-fg-subtle">Quizzes</p>
              {c.quizzes.length ? <ul className="flex flex-col gap-2">{c.quizzes.map((q) => <li key={q.title} className="text-sm"><div className="flex justify-between"><span className="truncate">{q.title}</span><span className="text-caption text-fg-muted">{q.attempts} attempts · avg {q.avg ?? "—"}% · pass {q.passRate ?? "—"}%</span></div><Progress value={q.avg ?? 0} size="sm" tone={(q.avg ?? 0) >= 60 ? "success" : "warning"} className="mt-1" /></li>)}</ul> : <p className="text-caption text-fg-muted">No quiz data.</p>}
            </div>
            <div>
              <p className="text-label mb-2 text-fg-subtle">Assignments</p>
              {c.assignments.length ? <ul className="flex flex-col gap-2">{c.assignments.map((a) => <li key={a.title} className="text-sm"><div className="flex justify-between"><span className="truncate">{a.title}</span><span className="text-caption text-fg-muted">{a.submitted} submitted · {a.approved} approved</span></div><Progress value={a.submitted ? (a.approved / a.submitted) * 100 : 0} size="sm" className="mt-1" /></li>)}</ul> : <p className="text-caption text-fg-muted">No assignment data.</p>}
            </div>
          </div>
        </section>
      ))}
      {data.batches.length ? (
        <section className="surface p-5">
          <p className="text-h4 mb-3">Batch attendance</p>
          <BarsChart data={data.batches.map((b) => ({ label: b.name, value: b.attendanceRate ?? 0 }))} format={(v) => `${v}%`} name="Attendance" color="var(--success)" height={Math.max(160, data.batches.length * 40)} horizontal />
        </section>
      ) : null}
    </div>
  );
}
