import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle, FileText, UserCheck } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getLead } from "@/server/services/crm";
import { leadFormOptions } from "@/server/queries/lead-options";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { LeadStagePicker, LeadAssign, LeadActivityComposer, LeadTasks, LeadNotes, LeadEditDialog, LeadDeleteButton } from "./lead-panels";
import { enumLabel, formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Lead" };
export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("crm.leads.read")]);
  const [lead, options] = await Promise.all([getLead(id), leadFormOptions()]);
  const canUpdate = can(user, "crm.leads.update");
  const wa = lead.whatsapp ?? lead.phone;
  const overdue = lead.nextFollowUpAt && lead.nextFollowUpAt < new Date() && !["ENROLLED", "LOST"].includes(lead.stage);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Leads", href: "/admin/leads" }, { label: lead.name }]}
        title={lead.name}
        description={`${enumLabel(lead.source)}${lead.campaign ? ` · ${lead.campaign.name}` : ""} · created ${relativeTime(lead.createdAt)} · score ${lead.score}`}
        actions={<div className="flex flex-wrap items-center gap-2">{canUpdate ? <LeadStagePicker leadId={lead.id} stage={lead.stage} /> : <Badge variant={statusVariant(lead.stage)}>{enumLabel(lead.stage)}</Badge>}{canUpdate ? <LeadEditDialog id={lead.id} options={options} initial={{ name: lead.name, phone: lead.phone ?? "", whatsapp: lead.whatsapp ?? "", email: lead.email ?? "", city: lead.city ?? "", education: lead.education ?? "", courseId: lead.courseId ?? "", interest: lead.interest ?? "", source: lead.source, campaignId: lead.campaignId ?? "", counsellorId: lead.counsellorId ?? "", preferredMode: lead.preferredMode ?? "", message: lead.message ?? "", nextFollowUpAt: lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt.getTime() - lead.nextFollowUpAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "" }} /> : null}{can(user, "crm.leads.delete") ? <LeadDeleteButton leadId={lead.id} /> : null}</div>}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="flex flex-col gap-4">
          <div className="surface p-5">
            <ul className="space-y-2 text-body-sm">
              <li className="flex items-center gap-2"><Phone className="size-4 text-fg-subtle" />{lead.phone ? <a href={`tel:${lead.phone}`} className="hover:text-accent">{lead.phone}</a> : <span className="text-fg-subtle">No phone</span>}</li>
              <li className="flex items-center gap-2"><MessageCircle className="size-4 text-fg-subtle" />{wa ? <a href={`https://wa.me/${wa.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:text-accent">WhatsApp {wa}</a> : <span className="text-fg-subtle">No WhatsApp</span>}</li>
              <li className="flex items-center gap-2"><Mail className="size-4 text-fg-subtle" />{lead.email ? <a href={`mailto:${lead.email}`} className="truncate hover:text-accent">{lead.email}</a> : <span className="text-fg-subtle">No email</span>}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4 text-fg-subtle" />{lead.city ?? "—"}{lead.education ? ` · ${lead.education}` : ""}</li>
            </ul>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-caption">
              <dt className="text-fg-subtle">Course</dt><dd>{lead.course ? <Link href={`/courses/${lead.course.slug}`} className="hover:text-accent">{lead.course.title}</Link> : "Undecided"}</dd>
              <dt className="text-fg-subtle">Mode</dt><dd>{lead.preferredMode ? enumLabel(lead.preferredMode) : "Any"}</dd>
              <dt className="text-fg-subtle">Interest</dt><dd>{lead.interest ?? "—"}</dd>
              <dt className="text-fg-subtle">Follow-up</dt><dd className={overdue ? "text-danger" : undefined}>{lead.nextFollowUpAt ? formatDateTime(lead.nextFollowUpAt) : "Not set"}</dd>
              <dt className="text-fg-subtle">Last contact</dt><dd>{lead.lastContactedAt ? relativeTime(lead.lastContactedAt) : "Never"}</dd>
            </dl>
            {lead.message ? <p className="mt-3 rounded-md bg-bg-muted p-3 text-caption text-fg-muted">“{lead.message}”</p> : null}
            {lead.lostReason ? <p className="mt-3 rounded-md bg-danger-soft p-3 text-caption text-danger">Lost: {lead.lostReason}</p> : null}
          </div>
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Counsellor</p>
            <div className="flex items-center justify-between gap-2">
              {lead.counsellor ? <span className="flex items-center gap-2 text-sm"><Avatar name={lead.counsellor.name} src={lead.counsellor.avatar?.url} size="xs" />{lead.counsellor.name}</span> : <span className="text-caption text-fg-subtle">Unassigned</span>}
              {can(user, "crm.leads.assign") ? <LeadAssign leadId={lead.id} current={lead.counsellorId} counsellors={options.counsellors} /> : null}
            </div>
          </div>
          {lead.application ? <Link href={`/admin/applications/${lead.application.id}`} className="surface surface-hover flex items-center gap-3 p-4 text-sm"><FileText className="size-4 text-accent" /><span>Application {lead.application.number}<span className="block text-caption text-fg-subtle">{enumLabel(lead.application.status)}</span></span></Link> : null}
          {lead.convertedUser ? <div className="surface flex items-center gap-3 p-4 text-sm"><UserCheck className="size-4 text-success" /><span>Converted to {lead.convertedUser.name}<span className="block text-caption text-fg-subtle">{lead.convertedUser.email}</span></span></div> : null}
          {canUpdate ? <LeadTasks leadId={lead.id} tasks={lead.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, dueAt: t.dueAt?.toISOString() ?? null, assignee: t.assignee?.name ?? null }))} counsellors={options.counsellors} /> : null}
        </aside>
        <div className="flex flex-col gap-6 lg:col-span-2">
          {canUpdate ? <LeadActivityComposer leadId={lead.id} /> : null}
          <section>
            <p className="text-h4 mb-3">Timeline</p>
            {lead.activities.length ? (
              <ol className="relative flex flex-col gap-4 border-s border-border ps-5">
                {lead.activities.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -start-[27px] top-1 size-3 rounded-full border-2 border-surface bg-accent" />
                    <div className="flex flex-wrap items-center gap-2 text-sm"><Badge variant="default">{enumLabel(a.type)}</Badge><span className="font-medium">{a.summary}</span></div>
                    {a.details && typeof a.details === "object" && "text" in (a.details as Record<string, unknown>) ? <p className="mt-1 text-caption text-fg-muted">{String((a.details as Record<string, unknown>).text)}</p> : null}
                    <p className="text-caption text-fg-subtle">{a.actor?.name ?? "System"} · {formatDateTime(a.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">No activity yet. Log the first call or WhatsApp above.</p>}
          </section>
          <LeadNotes leadId={lead.id} canAdd={canUpdate} notes={lead.notes.map((n) => ({ id: n.id, body: n.body, author: n.author?.name ?? "—", createdAt: n.createdAt.toISOString() }))} />
        </div>
      </div>
    </div>
  );
}
