import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Kanban, Users, Percent, ArrowRight } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { crmStats, LEAD_STAGES } from "@/server/services/crm";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { FunnelChart, BarsChart } from "@/components/charts";
import { Badge, statusVariant } from "@/components/ui/badge";
import { enumLabel, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Admissions" };
export const dynamic = "force-dynamic";

export default async function AdmissionsPage() {
  await requirePermission("applications.read");
  const since = new Date(Date.now() - 30 * 86400000);
  const [stats, stageCounts, appCounts, pending, byCourse, campaigns] = await Promise.all([
    crmStats(),
    prisma.lead.groupBy({ by: ["stage"], where: { deletedAt: null, createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.application.groupBy({ by: ["status"], where: { NOT: { status: "DRAFT" }, submittedAt: { gte: since } }, _count: { _all: true } }),
    prisma.application.findMany({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } }, orderBy: { submittedAt: "asc" }, take: 8, select: { id: true, number: true, personal: true, status: true, submittedAt: true, course: { select: { title: true } } } }),
    prisma.application.groupBy({ by: ["courseId"], where: { NOT: { status: "DRAFT" }, submittedAt: { gte: since } }, _count: { _all: true } }),
    prisma.campaign.findMany({ where: { isActive: true }, include: { _count: { select: { leads: { where: { createdAt: { gte: since } } } } } }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  const courseTitles = byCourse.length ? await prisma.course.findMany({ where: { id: { in: byCourse.map((c) => c.courseId) } }, select: { id: true, title: true } }) : [];
  const count = (s: string) => appCounts.find((c) => c.status === s)?._count._all ?? 0;
  const submittedTotal = appCounts.reduce((s, c) => s + c._count._all, 0);
  const nameOf = (p: unknown) => { const x = (p ?? {}) as { firstName?: string; lastName?: string }; return [x.firstName, x.lastName].filter(Boolean).join(" ") || "Applicant"; };
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Admissions" description="From first enquiry to enrolled student. Last 30 days unless stated." actions={<div className="flex gap-2"><Link href="/admin/leads" className="text-sm text-accent hover:underline">Pipeline</Link><Link href="/admin/applications" className="text-sm text-accent hover:underline">Applications</Link></div>} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Kanban} label="New leads" value={stats.newThisMonth} hint={`${stats.overdue} overdue follow-ups`} tone="accent" />
        <StatTile icon={FileText} label="Applications" value={submittedTotal} hint={`${count("SUBMITTED") + count("UNDER_REVIEW")} awaiting decision`} />
        <StatTile icon={Users} label="Enrolled" value={stats.enrolled} hint={`${stats.lost} marked lost`} tone="success" />
        <StatTile icon={Percent} label="Lead → enrolled" value={`${stats.conversion}%`} hint="conversion this month" tone={stats.conversion >= 20 ? "success" : "warning"} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-1"><p className="text-h4 mb-3">Lead funnel</p><FunnelChart steps={LEAD_STAGES.filter((s) => s !== "LOST").map((s) => ({ stage: enumLabel(s), value: stageCounts.find((c) => c.stage === s)?._count._all ?? 0 }))} /></div>
        <div className="surface p-5"><p className="text-h4 mb-3">Leads by source</p><BarsChart data={stats.bySource.map((s) => ({ label: enumLabel(s.source), value: s.count }))} horizontal height={Math.max(200, stats.bySource.length * 34)} name="Leads" /></div>
        <div className="surface p-5"><p className="text-h4 mb-3">Applications by course</p><BarsChart data={byCourse.map((c) => ({ label: (courseTitles.find((t) => t.id === c.courseId)?.title ?? "Course").slice(0, 24), value: c._count._all }))} horizontal height={Math.max(200, byCourse.length * 34)} name="Applications" color="var(--success)" /></div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Waiting for a decision</p><Link href="/admin/applications?status=SUBMITTED" className="text-caption text-accent hover:underline">View all</Link></div>
          {pending.length ? <ul className="surface divide-y divide-border">{pending.map((a) => <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm"><span className="min-w-0"><Link href={`/admin/applications/${a.id}`} className="block truncate font-medium hover:text-accent">{nameOf(a.personal)}</Link><span className="block text-caption text-fg-subtle">{a.course.title} · {a.number}{a.submittedAt ? ` · ${relativeTime(a.submittedAt)}` : ""}</span></span><span className="flex items-center gap-2"><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge><ArrowRight className="size-4 text-fg-subtle" /></span></li>)}</ul> : <p className="surface p-6 text-body-sm text-fg-muted">Inbox zero. Every application has a decision.</p>}
        </div>
        <div>
          <p className="text-h4 mb-3">Active campaigns</p>
          {campaigns.length ? <ul className="surface divide-y divide-border">{campaigns.map((c) => <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm"><span>{c.name}<span className="block text-caption text-fg-subtle">{enumLabel(c.source)}{c.utmCampaign ? ` · ${c.utmCampaign}` : ""}</span></span><Badge>{c._count.leads} leads</Badge></li>)}</ul> : <p className="surface p-6 text-body-sm text-fg-muted">No campaigns yet. Leads still track their source and UTM automatically.</p>}
        </div>
      </section>
    </div>
  );
}
