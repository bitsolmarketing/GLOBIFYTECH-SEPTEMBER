import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Paperclip, ExternalLink } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { getAssignmentForStudent } from "@/server/services/assignments";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { AssignmentSubmitForm } from "@/components/lms/assignment-submit-form";
import { enumLabel, formatDateTime, toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Assignment" };
export const dynamic = "force-dynamic";

export default async function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { studentId }] = await Promise.all([params, requireStudentProfile()]);
  const data = await getAssignmentForStudent(id, studentId).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!data) notFound();
  const { assignment, submissions } = data;
  const latest = submissions[0] ?? null;
  const canSubmit = !latest || ["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(latest.status);
  const overdue = !!assignment.dueAt && assignment.dueAt < new Date();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Assignments", href: "/student/assignments" }, { label: assignment.title }]} title={assignment.title} description={`${assignment.course.title}${assignment.dueAt ? ` · due ${formatDateTime(assignment.dueAt)}` : ""} · ${toNumber(assignment.maxPoints)} points`} actions={latest ? <Badge variant={statusVariant(latest.status)} className="px-3 py-1">{enumLabel(latest.status)}</Badge> : null} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="surface p-6">
            <h2 className="text-h4 mb-3">Instructions</h2>
            {assignment.instructions ? <div className="prose-globify" dangerouslySetInnerHTML={{ __html: assignment.instructions }} /> : <p className="text-body-sm text-fg-muted">No written instructions.</p>}
            {assignment.rubric ? (
              <div className="mt-6">
                <h3 className="text-label mb-2 text-fg-subtle">Rubric · {assignment.rubric.title}</h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {assignment.rubric.criteria.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                      <div>
                        <p className="font-medium">{c.title}</p>
                        {c.description ? <p className="text-caption text-fg-muted">{c.description}</p> : null}
                      </div>
                      <span className="shrink-0 text-caption tabular-nums text-fg-muted">{toNumber(c.maxPoints)} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          {submissions.length ? (
            <section className="flex flex-col gap-3">
              <h2 className="text-h4">Your submissions</h2>
              {submissions.map((s) => (
                <div key={s.id} className="surface flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">Attempt {s.attempt} · {s.submittedAt ? formatDateTime(s.submittedAt) : "draft"}{s.isLate ? " · late" : ""}</p>
                    <div className="flex items-center gap-2">
                      {s.score != null ? <span className="text-sm font-semibold">{toNumber(s.score)}/{toNumber(assignment.maxPoints)}</span> : null}
                      <Badge variant={statusVariant(s.status)}>{enumLabel(s.status)}</Badge>
                    </div>
                  </div>
                  {s.text ? <p className="whitespace-pre-wrap text-body-sm text-fg-muted">{s.text}</p> : null}
                  {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-body-sm text-accent hover:underline"><ExternalLink className="size-4" /> {s.url}</a> : null}
                  {s.files.length ? (
                    <ul className="flex flex-wrap gap-2">
                      {s.files.map((f) => (
                        <li key={f.id}><a href={f.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption hover:border-accent"><Paperclip className="size-3" /> {f.media.fileName}</a></li>
                      ))}
                    </ul>
                  ) : null}
                  {s.rubricScores.length ? (
                    <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                      {s.rubricScores.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3 p-2.5">
                          <span>{r.criterion.title}{r.comment ? <span className="text-fg-muted"> — {r.comment}</span> : null}</span>
                          <span className="tabular-nums">{toNumber(r.points)}/{toNumber(r.criterion.maxPoints)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {s.feedback.length ? (
                    <div className="rounded-lg bg-bg-subtle p-3">
                      <p className="text-label mb-1 text-fg-subtle">Instructor feedback{s.reviewedBy ? ` · ${s.reviewedBy.name}` : ""}</p>
                      {s.feedback.map((f) => (
                        <p key={f.id} className="whitespace-pre-wrap text-body-sm">{f.body}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
        </div>
        <aside className="lg:col-span-5">
          <div className="surface sticky top-20 p-6">
            {canSubmit ? (
              overdue && !assignment.allowLate ? (
                <p className="text-body-sm text-fg-muted">The deadline has passed and late submissions aren’t accepted. Contact your instructor.</p>
              ) : (
                <>
                  <h2 className="text-h4 mb-1">{latest?.status === "REVISION_REQUESTED" ? "Resubmit" : latest?.status === "DRAFT" ? "Continue your draft" : "Submit your work"}</h2>
                  {overdue && assignment.latePenaltyPercent ? <p className="mb-3 text-caption text-warning">Late submissions lose {assignment.latePenaltyPercent}%.</p> : <p className="mb-3 text-caption text-fg-muted">Accepted: {assignment.allowedKinds.map((k) => k.toLowerCase()).join(", ")}</p>}
                  <AssignmentSubmitForm assignmentId={assignment.id} allowedKinds={assignment.allowedKinds} draft={latest?.status === "DRAFT" ? { kind: latest.kind, text: latest.text, url: latest.url, files: latest.files.map((f) => ({ mediaId: f.mediaId, url: f.media.url, fileName: f.media.fileName, mime: f.media.mime, size: f.media.size })) } : null} />
                </>
              )
            ) : (
              <p className="text-body-sm text-fg-muted">{latest?.status === "APPROVED" ? "This assignment is approved. Nice work." : "Your submission is with your instructor. You'll be notified when it's reviewed."}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
