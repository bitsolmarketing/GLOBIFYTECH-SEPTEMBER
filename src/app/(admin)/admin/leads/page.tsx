import type { Metadata } from "next";
import Link from "next/link";
import { Kanban, Plus, List, AlertCircle } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listLeads, pipeline, crmStats, LEAD_STAGES } from "@/server/services/crm";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { PipelineBoard } from "./pipeline-board";
import { enumLabel, relativeTime, formatDateTime, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Leads" };
export const dynamic = "force-dynamic";

const SOURCES = ["WEBSITE", "FACEBOOK", "INSTAGRAM", "GOOGLE", "WHATSAPP", "REFERRAL", "WALK_IN", "PHONE", "EVENT", "ORGANIC"];

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; stage?: string; source?: string; counsellor?: string; course?: string; overdue?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("crm.leads.read")]);
  const view = sp.view === "list" ? "list" : "board";
  const page = Number(sp.page ?? 1) || 1;
  const stage = LEAD_STAGES.find((s) => s === sp.stage);
  const [stats, counsellors, courses] = await Promise.all([
    crmStats(),
    prisma.user.findMany({ where: { status: "ACTIVE", roles: { some: { role: { key: { in: ["COUNSELLOR", "ADMISSIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] } } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { deletedAt: null, status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const board = view === "board" ? await pipeline({ counsellorId: sp.counsellor, courseId: sp.course }) : null;
  const list = view === "list" ? await listLeads({ q: sp.q, stage, source: sp.source, counsellorId: sp.counsellor, courseId: sp.course, overdueOnly: sp.overdue === "1", page, pageSize: 25 }) : null;
  const canUpdate = can(user, "crm.leads.update");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Leads" description={`${stats.total.toLocaleString()} leads · ${stats.newThisMonth} new in 30 days · ${stats.conversion}% converted`} actions={<div className="flex items-center gap-2"><div className="flex gap-1 rounded-lg bg-bg-muted p-1"><Link href="/admin/leads" className={cn("rounded-md px-3 py-1.5 text-sm", view === "board" ? "bg-surface text-fg shadow-xs" : "text-fg-muted")}><Kanban className="me-1 inline size-4" />Board</Link><Link href="/admin/leads?view=list" className={cn("rounded-md px-3 py-1.5 text-sm", view === "list" ? "bg-surface text-fg shadow-xs" : "text-fg-muted")}><List className="me-1 inline size-4" />List</Link></div>{can(user, "crm.leads.create") ? <Button asChild size="sm"><Link href="/admin/leads/new"><Plus /> New lead</Link></Button> : null}</div>} />
      {stats.overdue ? <Link href="/admin/leads?view=list&overdue=1" className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-soft px-4 py-2 text-sm text-warning"><AlertCircle className="size-4" />{stats.overdue} lead{stats.overdue > 1 ? "s have" : " has"} an overdue follow-up.</Link> : null}
      <FilterBar searchPlaceholder="Name, phone, email or city" filters={[
        ...(view === "list" ? [{ key: "stage", label: "stages", options: LEAD_STAGES.map((s) => ({ value: s, label: enumLabel(s) })) }, { key: "source", label: "sources", options: SOURCES.map((s) => ({ value: s, label: enumLabel(s) })) }] : []),
        { key: "counsellor", label: "counsellors", options: counsellors.map((c) => ({ value: c.id, label: c.name })) },
        { key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) },
      ]} />
      {board ? (
        <PipelineBoard canUpdate={canUpdate} columns={board.map((c) => ({ stage: c.stage, total: c.total, leads: c.leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, city: l.city, score: l.score, course: l.course?.title ?? null, counsellor: l.counsellor ? { name: l.counsellor.name, avatar: l.counsellor.avatar?.url ?? null } : null, nextFollowUpAt: l.nextFollowUpAt?.toISOString() ?? null, updatedAt: l.updatedAt.toISOString(), source: l.source })) }))} />
      ) : null}
      {list ? (
        list.items.length ? (
          <>
            <AdminTable headers={["Lead", "Course", "Source", "Counsellor", "Follow-up", { label: "Score", align: "end" }, "Stage"]}>
              {list.items.map((l) => {
                const overdue = l.nextFollowUpAt && l.nextFollowUpAt < new Date() && !["ENROLLED", "LOST"].includes(l.stage);
                return (
                  <Row key={l.id}>
                    <Cell><Link href={`/admin/leads/${l.id}`} className="font-medium hover:text-accent">{l.name}</Link><span className="block text-caption text-fg-subtle">{l.phone ?? l.email ?? "—"}{l.city ? ` · ${l.city}` : ""}</span></Cell>
                    <Cell muted>{l.course?.title ?? "—"}</Cell>
                    <Cell className="text-caption text-fg-muted">{enumLabel(l.source)}{l.campaign ? <span className="block text-fg-subtle">{l.campaign.name}</span> : null}</Cell>
                    <Cell>{l.counsellor ? <span className="flex items-center gap-1.5 text-caption"><Avatar name={l.counsellor.name} src={l.counsellor.avatar?.url} size="xs" />{l.counsellor.name}</span> : <span className="text-caption text-fg-subtle">Unassigned</span>}</Cell>
                    <Cell className={cn("text-caption", overdue ? "text-danger" : "text-fg-muted")}>{l.nextFollowUpAt ? formatDateTime(l.nextFollowUpAt) : "—"}{l._count.tasks ? <span className="block text-fg-subtle">{l._count.tasks} open task{l._count.tasks > 1 ? "s" : ""}</span> : null}</Cell>
                    <Cell align="end" className="tabular-nums">{l.score}</Cell>
                    <Cell><Badge variant={statusVariant(l.stage)}>{enumLabel(l.stage)}</Badge><span className="block text-caption text-fg-subtle">{relativeTime(l.updatedAt)}</span></Cell>
                  </Row>
                );
              })}
            </AdminTable>
            <Pagination page={list.page} pageSize={list.pageSize} total={list.total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/leads?${q}`; }} />
          </>
        ) : <EmptyState icon={<Kanban />} title="No leads match." />
      ) : null}
    </div>
  );
}
