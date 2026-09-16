import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getApplication } from "@/server/services/applications";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { DecisionForm } from "./decision-form";
import { enumLabel, formatDate, formatDateTime, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Application" };
export const dynamic = "force-dynamic";

type Personal = { firstName?: string; lastName?: string; email?: string; phone?: string; whatsapp?: string | null; city?: string; dateOfBirth?: string; gender?: string; address?: string };
type Education = { level?: string; institution?: string; field?: string; year?: number | string };
type Experience = { title?: string; company?: string; years?: number | string };

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("applications.read")]);
  const app = await getApplication(id);
  const p = (app.personal ?? {}) as Personal;
  const education = (Array.isArray(app.education) ? app.education : []) as Education[];
  const experience = (Array.isArray(app.experience) ? app.experience : []) as Experience[];
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ") || "Applicant";
  const decided = ["ENROLLED", "REJECTED"].includes(app.status);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Applications", href: "/admin/applications" }, { label: app.number }]} title={name} description={`${app.number} · ${app.course.title} · ${enumLabel(app.preferredMode)}${app.submittedAt ? ` · submitted ${formatDateTime(app.submittedAt)}` : ""}`} actions={<Badge variant={statusVariant(app.status)}>{enumLabel(app.status)}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="surface p-5">
            <p className="text-h4 mb-3">Applicant</p>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <dt className="text-fg-subtle">Email</dt><dd>{p.email ? <a href={`mailto:${p.email}`} className="hover:text-accent">{p.email}</a> : "—"}</dd>
              <dt className="text-fg-subtle">Phone</dt><dd>{p.phone ?? "—"}{p.whatsapp && p.whatsapp !== p.phone ? ` · WhatsApp ${p.whatsapp}` : ""}</dd>
              <dt className="text-fg-subtle">City</dt><dd>{p.city ?? "—"}</dd>
              <dt className="text-fg-subtle">Date of birth</dt><dd>{p.dateOfBirth ? formatDate(new Date(p.dateOfBirth)) : "—"}</dd>
              <dt className="text-fg-subtle">Gender</dt><dd>{p.gender ? enumLabel(p.gender) : "—"}</dd>
              <dt className="text-fg-subtle">Address</dt><dd>{p.address ?? "—"}</dd>
              <dt className="text-fg-subtle">Preferred batch</dt><dd>{app.preferredBatch ? `${app.preferredBatch.code} · ${app.preferredBatch.name}` : "Any"}</dd>
              <dt className="text-fg-subtle">Account</dt><dd>{app.applicant ? <Link href={`/admin/students?q=${encodeURIComponent(app.applicant.email)}`} className="hover:text-accent">{app.applicant.email}</Link> : "Guest application"}</dd>
            </dl>
          </section>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="surface p-5"><p className="text-h4 mb-3">Education</p>{education.length ? <ul className="flex flex-col gap-2 text-sm">{education.map((e, i) => <li key={i}><span className="font-medium">{e.level}</span>{e.field ? ` in ${e.field}` : ""}<span className="block text-caption text-fg-muted">{e.institution}{e.year ? ` · ${e.year}` : ""}</span></li>)}</ul> : <p className="text-caption text-fg-muted">Not provided.</p>}</div>
            <div className="surface p-5"><p className="text-h4 mb-3">Experience</p>{experience.length ? <ul className="flex flex-col gap-2 text-sm">{experience.map((e, i) => <li key={i}><span className="font-medium">{e.title}</span><span className="block text-caption text-fg-muted">{e.company}{e.years ? ` · ${e.years} yrs` : ""}</span></li>)}</ul> : <p className="text-caption text-fg-muted">No work experience listed.</p>}</div>
          </section>
          {app.goals ? <section className="surface p-5"><p className="text-h4 mb-2">Goals</p><p className="whitespace-pre-wrap text-body-sm text-fg-muted">{app.goals}</p></section> : null}
          <section className="surface p-5">
            <p className="text-h4 mb-3">Documents</p>
            {app.documents.length ? <ul className="flex flex-wrap gap-2">{app.documents.map((d) => <li key={d.id}><a href={d.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-bg-subtle"><FileText className="size-4 text-accent" />{enumLabel(d.kind)}<span className="text-caption text-fg-subtle">{d.media.fileName}</span><ExternalLink className="size-3 text-fg-subtle" /></a></li>)}</ul> : <p className="text-caption text-fg-muted">No documents uploaded.</p>}
          </section>
          {app.decisionNote ? <section className="surface p-5"><p className="text-h4 mb-2">Decision note</p><p className="text-body-sm text-fg-muted">{app.decisionNote}</p><p className="mt-1 text-caption text-fg-subtle">{app.reviewedBy?.name}{app.reviewedAt ? ` · ${formatDateTime(app.reviewedAt)}` : ""}</p></section> : null}
        </div>
        <aside className="flex flex-col gap-4">
          {can(user, "applications.review") && !decided ? (
            <DecisionForm applicationId={app.id} status={app.status} preferredBatchId={app.preferredBatchId} batches={app.course.batches.map((b) => ({ id: b.id, label: `${b.code} · ${formatDate(b.startDate)} · ${b._count.students}/${b.capacity}` }))} feePlans={app.course.feePlans.map((f) => ({ id: f.id, label: `${f.name} · ${formatMoney(toNumber(f.totalAmount), f.currency)}${f.installments.length > 1 ? ` (${f.installments.length} installments)` : ""}`, isDefault: f.isDefault }))} />
          ) : (
            <div className="surface p-5 text-body-sm text-fg-muted">{decided ? `This application is ${enumLabel(app.status).toLowerCase()}.` : "You can view but not decide on applications."}{app.enrollmentId ? <Link href="/admin/enrollments" className="mt-2 block text-accent hover:underline">View enrollment</Link> : null}</div>
          )}
          {app.lead ? <Link href={`/admin/leads/${app.lead.id}`} className="surface surface-hover p-4 text-sm">CRM lead<span className="block text-caption text-fg-subtle">{enumLabel(app.lead.stage)}{app.lead.counsellor ? ` · ${app.lead.counsellor.name}` : ""}</span></Link> : null}
        </aside>
      </div>
    </div>
  );
}
