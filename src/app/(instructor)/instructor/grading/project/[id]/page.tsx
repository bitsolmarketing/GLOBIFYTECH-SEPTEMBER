import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Paperclip, Check, Circle } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { getProjectSubmissionForReview } from "@/server/services/projects";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { GradingForm } from "@/components/studio/grading-form";
import { enumLabel, formatDateTime, toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Review project" };
export const dynamic = "force-dynamic";

export default async function ProjectReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const scope = await instructorScope(user);
  const s = await getProjectSubmissionForReview(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!s) notFound();
  await scope.assertCourse(s.project.courseId).catch(() => notFound());
  const gradable = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"].includes(s.status);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Grading", href: "/instructor/grading" }, { label: s.project.title }]} title={s.title || s.project.title} description={`${s.project.course.title} · ${s.student.user.name}${s.submittedAt ? ` · submitted ${formatDateTime(s.submittedAt)}` : ""}`} actions={<Badge variant={statusVariant(s.status)} className="px-3 py-1">{enumLabel(s.status)}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="surface flex flex-col gap-4 p-6">
            <Link href={`/instructor/students/${s.student.id}`} className="flex items-center gap-3 hover:text-accent"><Avatar name={s.student.user.name} src={s.student.user.avatar?.url} size="md" /><div><p className="font-medium">{s.student.user.name}</p><p className="text-caption text-fg-muted">{s.student.studentNumber}</p></div></Link>
            {s.description ? <div className="whitespace-pre-wrap rounded-lg bg-bg-subtle p-4 text-sm">{s.description}</div> : null}
            <div className="flex flex-wrap gap-3 text-sm">
              {s.repoUrl ? <a href={s.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="size-4" /> Repository</a> : null}
              {s.liveUrl ? <a href={s.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline"><ExternalLink className="size-4" /> Live site</a> : null}
            </div>
            {s.files.length ? <ul className="flex flex-wrap gap-2">{s.files.map((f) => <li key={f.id}><a href={f.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-accent"><Paperclip className="size-3.5" /> {f.media.fileName}</a></li>)}</ul> : null}
            {s.project.milestones.length ? (
              <ul className="flex flex-col gap-1 text-sm">
                {s.project.milestones.map((m) => <li key={m.id} className="flex items-center gap-2">{s.milestonesDone.includes(m.id) ? <Check className="size-4 text-success" /> : <Circle className="size-4 text-fg-subtle" />} {m.title}</li>)}
              </ul>
            ) : null}
          </section>
          {s.feedback.length ? <section className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Previous feedback</p>{s.feedback.map((f) => <p key={f.id} className="whitespace-pre-wrap border-t border-border py-2 text-sm first:border-0">{f.body}</p>)}</section> : null}
          <section className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Project brief</p>{s.project.requirements ? <div className="prose-globify text-sm" dangerouslySetInnerHTML={{ __html: s.project.requirements }} /> : <p className="text-caption text-fg-muted">{s.project.overview}</p>}</section>
        </div>
        <aside className="lg:col-span-5">
          <div className="surface sticky top-20 p-6">
            {gradable ? (
              <GradingForm submissionId={s.id} kind="project" maxPoints={toNumber(s.project.maxPoints)} rubric={s.project.rubric ? { title: s.project.rubric.title, criteria: s.project.rubric.criteria.map((c) => ({ id: c.id, title: c.title, description: c.description, maxPoints: toNumber(c.maxPoints) })) } : null} initialScore={s.score != null ? toNumber(s.score) : null} nextHref="/instructor/grading" />
            ) : (
              <p className="text-sm text-fg-muted">Reviewed{s.reviewedAt ? ` ${formatDateTime(s.reviewedAt)}` : ""}{s.score != null ? ` · ${toNumber(s.score)}/${toNumber(s.project.maxPoints)}` : ""}.</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
