import type { Metadata } from "next";
import Link from "next/link";
import { Users, GraduationCap, Wallet, Kanban, AlertTriangle, FileText, Receipt, Video, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { adminOverview } from "@/server/services/analytics";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { TrendChart, FunnelChart } from "@/components/charts";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, greeting, relativeTime, enumLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Command Center" };
export const dynamic = "force-dynamic";

function Delta({ value, suffix = "" }: { value: number | null | undefined; suffix?: string }) {
  if (value === null || value === undefined) return null;
  const up = value >= 0;
  return <span className={up ? "inline-flex items-center gap-0.5 text-caption text-success" : "inline-flex items-center gap-0.5 text-caption text-danger"}>{up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}{up ? "+" : ""}{value}{suffix}</span>;
}

export default async function AdminDashboard() {
  const user = await requireUser();
  const [o, recentLeads, recentApps, recentAudit] = await Promise.all([
    adminOverview(),
    can(user, "crm.leads.read") ? prisma.lead.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, name: true, stage: true, source: true, createdAt: true, course: { select: { title: true } } } }) : [],
    can(user, "applications.read") ? prisma.application.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: { submittedAt: "desc" }, take: 6, select: { id: true, number: true, personal: true, status: true, submittedAt: true, course: { select: { title: true } } } }) : [],
    can(user, "audit.read") ? prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, action: true, entityType: true, createdAt: true, actor: { select: { name: true } } } }) : [],
  ]);
  const k = o.kpis;
  const nameOf = (p: unknown) => { const x = (p ?? {}) as { firstName?: string; lastName?: string }; return [x.firstName, x.lastName].filter(Boolean).join(" ") || "Applicant"; };
  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Command Center" title={`${greeting()}, ${user.name.split(" ")[0]}.`} description="Everything happening across Globify Tech, live." actions={<div className="flex gap-2">{can(user, "reports.export") ? <Button asChild variant="outline" size="sm"><Link href="/admin/reports">Reports</Link></Button> : null}{can(user, "ai.admin_assistant") ? <Button asChild size="sm"><Link href="/admin/ai">Ask the assistant</Link></Button> : null}</div>} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Users} label="Students" value={k.students.value.toLocaleString()} hint={k.students.deltaLabel} tone="accent" />
        <StatTile icon={GraduationCap} label="Active enrollments" value={k.activeEnrollments.value.toLocaleString()} hint={`${k.completions.value} completions in 30 days`} />
        <StatTile icon={Wallet} label="Revenue this month" value={formatMoney(k.revenue.value)} hint={k.revenue.delta !== null ? `${k.revenue.delta >= 0 ? "+" : ""}${k.revenue.delta}% vs last month` : "No revenue last month"} tone="success" />
        <StatTile icon={Kanban} label="Leads (30 days)" value={k.leads.value.toLocaleString()} hint={`${k.leads.conversion}% converted to enrollment`} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/analytics?tab=risk" className="surface surface-hover flex items-center gap-3 p-4"><AlertTriangle className="size-5 text-warning" /><div><p className="text-h4 tabular-nums">{k.atRisk.value}</p><p className="text-caption text-fg-muted">students at high risk</p></div><ArrowRight className="ms-auto size-4 text-fg-subtle" /></Link>
        <Link href="/admin/applications?status=SUBMITTED" className="surface surface-hover flex items-center gap-3 p-4"><FileText className="size-5 text-accent" /><div><p className="text-h4 tabular-nums">{k.pendingApplications.value}</p><p className="text-caption text-fg-muted">applications awaiting review</p></div><ArrowRight className="ms-auto size-4 text-fg-subtle" /></Link>
        <Link href="/admin/invoices?status=OVERDUE" className="surface surface-hover flex items-center gap-3 p-4"><Receipt className="size-5 text-danger" /><div><p className="text-h4 tabular-nums">{formatMoney(k.outstanding.value)}</p><p className="text-caption text-fg-muted">outstanding across {k.outstanding.count} invoices</p></div><ArrowRight className="ms-auto size-4 text-fg-subtle" /></Link>
        <Link href="/admin/attendance" className="surface surface-hover flex items-center gap-3 p-4"><Video className="size-5 text-info" /><div><p className="text-h4 tabular-nums">{k.upcomingClasses.value}</p><p className="text-caption text-fg-muted">live classes in the next 7 days</p></div><ArrowRight className="ms-auto size-4 text-fg-subtle" /></Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Revenue, last 30 days</p><Delta value={k.revenue.delta} suffix="%" /></div>
          <TrendChart data={o.revenueSeries} format={(v) => formatMoney(v)} name="Revenue" />
        </div>
        <div className="surface p-5">
          <p className="text-h4 mb-3">Admissions funnel</p>
          <FunnelChart steps={o.leadFunnel.map((s) => ({ stage: enumLabel(s.stage), value: s.value }))} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">New enrollments</p><Delta value={k.students.delta} /></div>
          <TrendChart data={o.enrollmentSeries} kind="line" name="Enrollments" color="var(--success)" height={180} />
        </div>
        <div className="surface p-5">
          <p className="text-h4 mb-3">Top courses</p>
          <ul className="flex flex-col divide-y divide-border">
            {o.topCourses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm"><Link href={`/admin/courses/${c.id}`} className="truncate font-medium hover:text-accent">{c.title}</Link><span className="shrink-0 text-caption text-fg-muted">{c.students} students · {c.completed} done{c.rating ? ` · ★ ${c.rating.toFixed(1)}` : ""}</span></li>
            ))}
            {!o.topCourses.length ? <li className="py-2 text-caption text-fg-muted">No published courses yet.</li> : null}
          </ul>
        </div>
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Latest leads</p><Link href="/admin/leads" className="text-caption text-accent hover:underline">Pipeline</Link></div>
          <ul className="flex flex-col divide-y divide-border">
            {recentLeads.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><Link href={`/admin/leads/${l.id}`} className="block truncate font-medium hover:text-accent">{l.name}</Link><p className="truncate text-caption text-fg-muted">{l.course?.title ?? enumLabel(l.source)} · {relativeTime(l.createdAt)}</p></div><Badge variant={statusVariant(l.stage)}>{enumLabel(l.stage)}</Badge></li>
            ))}
            {!recentLeads.length ? <li className="py-2 text-caption text-fg-muted">No leads yet.</li> : null}
          </ul>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Applications to review</p><Link href="/admin/applications" className="text-caption text-accent hover:underline">All applications</Link></div>
          <ul className="flex flex-col divide-y divide-border">
            {recentApps.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm"><div className="min-w-0"><Link href={`/admin/applications/${a.id}`} className="block truncate font-medium hover:text-accent">{nameOf(a.personal)} <span className="text-caption text-fg-subtle">{a.number}</span></Link><p className="truncate text-caption text-fg-muted">{a.course.title}{a.submittedAt ? ` · ${relativeTime(a.submittedAt)}` : ""}</p></div><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge></li>
            ))}
            {!recentApps.length ? <li className="py-2 text-caption text-fg-muted">Inbox zero.</li> : null}
          </ul>
        </div>
        <div className="surface p-5">
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Recent activity</p><Link href="/admin/audit-logs" className="text-caption text-accent hover:underline">Audit log</Link></div>
          <ul className="flex flex-col divide-y divide-border">
            {recentAudit.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="truncate"><span className="font-medium">{a.actor?.name ?? "System"}</span> <span className="text-fg-muted">{a.action}</span> <span className="text-fg-subtle">{a.entityType}</span></span><span className="shrink-0 text-caption text-fg-subtle">{relativeTime(a.createdAt)}</span></li>
            ))}
            {!recentAudit.length ? <li className="py-2 text-caption text-fg-muted">Nothing recorded yet.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}
