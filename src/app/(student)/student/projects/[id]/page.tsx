import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Paperclip, Link2 } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { getProjectForStudent } from "@/server/services/projects";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { ProjectSubmitForm } from "@/components/lms/project-submit-form";
import { enumLabel, formatDateTime, toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Project" };
export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { studentId }] = await Promise.all([params, requireStudentProfile()]);
  const data = await getProjectForStudent(id, studentId).catch((e) => (e instanceof AppError && e.code === "NOT_FOUND" ? null : Promise.reject(e)));
  if (!data) notFound();
  const { project, submission } = data;
  const canSubmit = !submission || ["DRAFT", "REVISION_REQUESTED", "REJECTED"].includes(submission.status);
  const resources = (project.resources as Array<{ title: string; url: string }> | null) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Projects", href: "/student/projects" }, { label: project.title }]} title={project.title} description={`${project.course.title}${project.deadline ? ` · deadline ${formatDateTime(project.deadline)}` : ""} · ${toNumber(project.maxPoints)} points`} actions={submission ? <Badge variant={statusVariant(submission.status)} className="px-3 py-1">{enumLabel(submission.status)}</Badge> : null} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="surface flex flex-col gap-5 p-6">
            {project.overview ? <p className="text-body text-fg-muted">{project.overview}</p> : null}
            {project.requirements ? (
              <div>
                <h2 className="text-h4 mb-2">Requirements</h2>
                <div className="prose-globify" dangerouslySetInnerHTML={{ __html: project.requirements }} />
              </div>
            ) : null}
            {project.skills.length ? (
              <div>
                <h3 className="text-label mb-2 text-fg-subtle">Skills</h3>
                <div className="flex flex-wrap gap-1.5">{project.skills.map((s) => <Badge key={s} variant="accent">{s}</Badge>)}</div>
              </div>
            ) : null}
            {resources.length ? (
              <div>
                <h3 className="text-label mb-2 text-fg-subtle">Resources</h3>
                <ul className="flex flex-col gap-1.5">{resources.map((r) => <li key={r.url}><a href={r.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-body-sm text-accent hover:underline"><Link2 className="size-3.5" /> {r.title}</a></li>)}</ul>
              </div>
            ) : null}
            {project.rubric ? (
              <div>
                <h3 className="text-label mb-2 text-fg-subtle">Rubric · {project.rubric.title}</h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {project.rubric.criteria.map((c) => (
                    <li key={c.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                      <div><p className="font-medium">{c.title}</p>{c.description ? <p className="text-caption text-fg-muted">{c.description}</p> : null}</div>
                      <span className="shrink-0 text-caption tabular-nums text-fg-muted">{toNumber(c.maxPoints)} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
          {submission && submission.status !== "DRAFT" ? (
            <section className="surface flex flex-col gap-3 p-6">
              <h2 className="text-h4">Your submission</h2>
              {submission.title ? <p className="font-medium">{submission.title}</p> : null}
              {submission.description ? <p className="whitespace-pre-wrap text-body-sm text-fg-muted">{submission.description}</p> : null}
              <div className="flex flex-wrap gap-3 text-body-sm">
                {submission.repoUrl ? <a href={submission.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="size-4" /> Repository</a> : null}
                {submission.liveUrl ? <a href={submission.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="size-4" /> Live site</a> : null}
              </div>
              {submission.files.length ? <ul className="flex flex-wrap gap-2">{submission.files.map((f) => <li key={f.id}><a href={f.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-caption hover:border-accent"><Paperclip className="size-3" /> {f.media.fileName}</a></li>)}</ul> : null}
              {submission.score != null ? <p className="text-sm font-semibold">Score: {toNumber(submission.score)}/{toNumber(project.maxPoints)}</p> : null}
              {submission.rubricScores.length ? (
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {submission.rubricScores.map((r) => <li key={r.id} className="flex items-center justify-between gap-3 p-2.5"><span>{r.criterion.title}{r.comment ? <span className="text-fg-muted"> — {r.comment}</span> : null}</span><span className="tabular-nums">{toNumber(r.points)}/{toNumber(r.criterion.maxPoints)}</span></li>)}
                </ul>
              ) : null}
              {submission.feedback.length ? (
                <div className="rounded-lg bg-bg-subtle p-3">
                  <p className="text-label mb-1 text-fg-subtle">Feedback{submission.reviewedBy ? ` · ${submission.reviewedBy.name}` : ""}</p>
                  {submission.feedback.map((f) => <p key={f.id} className="whitespace-pre-wrap text-body-sm">{f.body}</p>)}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
        <aside className="lg:col-span-5">
          <div className="surface sticky top-20 p-6">
            {canSubmit ? (
              <>
                <h2 className="text-h4 mb-3">{submission?.status === "REVISION_REQUESTED" ? "Resubmit your project" : "Submit your project"}</h2>
                <ProjectSubmitForm projectId={project.id} milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))} draft={submission ? { title: submission.title, description: submission.description, repoUrl: submission.repoUrl, liveUrl: submission.liveUrl, milestonesDone: submission.milestonesDone, files: submission.files.map((f) => ({ mediaId: f.mediaId, url: f.media.url, fileName: f.media.fileName, mime: f.media.mime, size: f.media.size })) } : null} />
              </>
            ) : (
              <p className="text-body-sm text-fg-muted">{submission?.status === "APPROVED" ? "Approved — it's in your portfolio now." : "Your project is being reviewed. You'll be notified with feedback."}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
