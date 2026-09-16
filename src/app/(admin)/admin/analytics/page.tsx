import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { adminAnalytics } from "@/server/services/analytics";
import { latestRiskScores } from "@/server/services/risk";
import { PageHeader } from "@/components/layout/page-header";
import { TrendChart, BarsChart } from "@/components/charts";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { RiskTable } from "./risk-table";
import { formatMoney, enumLabel, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "courses", label: "Courses" },
  { key: "instructors", label: "Instructors" },
  { key: "risk", label: "Student success" },
] as const;

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<{ tab?: string; days?: string; level?: string; page?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("analytics.read")]);
  const tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as (typeof TABS)[number]["key"]) : "overview";
  const days = [30, 90, 180, 365].includes(Number(sp.days)) ? Number(sp.days) : 90;
  const data = await adminAnalytics(days);
  const risk = tab === "risk" ? await latestRiskScores({ level: sp.level === "HIGH" || sp.level === "MEDIUM" || sp.level === "LOW" ? sp.level : undefined, page: Number(sp.page ?? 1) || 1, pageSize: 25 }) : null;
  const href = (patch: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { tab, days, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "days" && v === 90) && !(k === "tab" && v === "overview")) q.set(k, String(v));
    const s = q.toString();
    return s ? `/admin/analytics?${s}` : "/admin/analytics";
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Analytics" description="Enrollment, revenue, learning and admissions performance across the institute." actions={<div className="flex gap-1 rounded-lg bg-bg-muted p-1">{[30, 90, 180, 365].map((d) => <Link key={d} href={href({ days: d })} className={cn("rounded-md px-3 py-1.5 text-sm", days === d ? "bg-surface shadow-xs text-fg" : "text-fg-muted hover:text-fg")}>{d}d</Link>)}</div>} />
      <nav className="flex w-full gap-1 border-b border-border">{TABS.map((t) => <Link key={t.key} href={href({ tab: t.key })} className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm font-medium", tab === t.key ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg")}>{t.label}</Link>)}</nav>

      {tab === "overview" ? (
        <div className="flex flex-col gap-4">
          <section className="grid gap-4 lg:grid-cols-2">
            <div className="surface p-5"><p className="text-h4 mb-3">Revenue</p><TrendChart data={data.revenueSeries} format="money" name="Revenue" /></div>
            <div className="surface p-5"><p className="text-h4 mb-3">Enrollments</p><TrendChart data={data.enrollmentSeries} kind="line" name="Enrollments" color="var(--success)" /></div>
            <div className="surface p-5"><p className="text-h4 mb-3">Leads captured</p><TrendChart data={data.leadSeries} kind="line" name="Leads" color="var(--info)" /></div>
            <div className="surface p-5"><p className="text-h4 mb-3">Course completions</p><TrendChart data={data.completionSeries} name="Completions" color="var(--warning)" /></div>
          </section>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="surface p-5"><p className="text-caption text-fg-muted">Attendance rate</p><p className="text-h2 tabular-nums">{data.attendanceRate ?? "—"}{data.attendanceRate !== null ? "%" : ""}</p><Progress value={data.attendanceRate ?? 0} size="sm" className="mt-2" /></div>
            <div className="surface p-5"><p className="text-caption text-fg-muted">Quiz attempts</p><p className="text-h2 tabular-nums">{data.quiz.attempts}</p><p className="text-caption text-fg-subtle">avg {data.quiz.avgPercent ?? "—"}% · pass rate {data.quiz.passRate ?? "—"}%</p></div>
            <div className="surface p-5"><p className="text-caption text-fg-muted">Lessons completed</p><p className="text-h2 tabular-nums">{data.lessonsCompleted.toLocaleString()}</p><p className="text-caption text-fg-subtle">in the last {days} days</p></div>
            <div className="surface p-5"><p className="text-caption text-fg-muted">Dropouts</p><p className="text-h2 tabular-nums text-danger">{data.dropouts}</p><p className="text-caption text-fg-subtle">enrollments dropped</p></div>
          </section>
          <section className="grid gap-4 lg:grid-cols-3">
            <div className="surface p-5"><p className="text-h4 mb-3">Leads by source</p><BarsChart data={data.leadsBySource.map((s) => ({ label: enumLabel(s.source), value: s.value }))} horizontal height={Math.max(180, data.leadsBySource.length * 36)} name="Leads" /></div>
            <div className="surface p-5"><p className="text-h4 mb-3">Revenue by provider</p><BarsChart data={data.revenueByProvider.map((s) => ({ label: enumLabel(s.provider), value: Math.round(s.value) }))} format="money" horizontal height={Math.max(180, data.revenueByProvider.length * 36)} name="Revenue" color="var(--success)" /></div>
            <div className="surface p-5"><p className="text-h4 mb-3">Assignment pipeline</p><BarsChart data={data.assignments.map((s) => ({ label: enumLabel(s.status), value: s.value }))} horizontal height={Math.max(180, data.assignments.length * 36)} name="Submissions" color="var(--info)" /></div>
          </section>
        </div>
      ) : null}

      {tab === "courses" ? (
        <AdminTable headers={["Course", { label: "Students", align: "end" }, "Avg progress", { label: "Completion", align: "end" }, { label: "Rating", align: "end" }]}>
          {data.courses.map((c) => (
            <Row key={c.id}>
              <Cell><Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-accent">{c.title}</Link></Cell>
              <Cell align="end">{c.students}</Cell>
              <Cell><div className="flex items-center gap-2"><Progress value={c.avgProgress} size="sm" className="w-28" /><span className="text-caption tabular-nums">{c.avgProgress}%</span></div></Cell>
              <Cell align="end">{c.completionRate}%</Cell>
              <Cell align="end">{c.rating ? `★ ${c.rating.toFixed(1)}` : "—"}</Cell>
            </Row>
          ))}
          {!data.courses.length ? <Row><Cell className="text-center text-fg-muted" >No courses yet.</Cell></Row> : null}
        </AdminTable>
      ) : null}

      {tab === "instructors" ? (
        <AdminTable headers={["Instructor", { label: "Students", align: "end" }, { label: "Completion rate", align: "end" }, { label: "Rating", align: "end" }]}>
          {data.instructors.map((i) => (
            <Row key={i.id}>
              <Cell><Link href={`/admin/instructors/${i.id}`} className="font-medium hover:text-accent">{i.name}</Link></Cell>
              <Cell align="end">{i.students}</Cell>
              <Cell align="end">{i.completionRate !== null ? `${i.completionRate}%` : "—"}</Cell>
              <Cell align="end">{i.rating ? `★ ${i.rating.toFixed(1)}` : "—"}</Cell>
            </Row>
          ))}
          {!data.instructors.length ? <Row><Cell className="text-center text-fg-muted">No instructors yet.</Cell></Row> : null}
        </AdminTable>
      ) : null}

      {tab === "risk" && risk ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["HIGH", "MEDIUM", "LOW"] as const).map((l) => <Link key={l} href={href({ level: sp.level === l ? undefined : l, page: undefined })}><Badge variant={sp.level === l ? statusVariant(l) : "default"} className="cursor-pointer">{enumLabel(l)}</Badge></Link>)}
            <span className="text-caption text-fg-muted">{risk.total} scored enrollments in the last 14 days</span>
          </div>
          <RiskTable
            items={risk.items.map((r) => ({ id: r.id, level: r.level, score: r.score, reasons: r.reasons, recommendation: r.recommendation, acknowledged: !!r.acknowledgedAt, computedAt: r.computedAt.toISOString(), student: { id: r.student.id, name: r.student.user.name, number: r.student.studentNumber, avatar: r.student.user.avatar?.url ?? null }, course: r.enrollment?.course.title ?? null, batch: r.enrollment?.batch?.code ?? null }))}
            page={risk.page}
            pageSize={risk.pageSize}
            total={risk.total}
            hrefFor={(p) => href({ page: p, level: sp.level })}
          />
        </div>
      ) : null}
    </div>
  );
}
