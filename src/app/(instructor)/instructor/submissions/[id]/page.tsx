import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Paperclip } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { getSubmissionForReview } from "@/server/services/assignments";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { GradingForm } from "@/components/studio/grading-form";
import { enumLabel, formatDateTime, toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Review submission" };
export const dynamic = "force-dynamic";

export default async function SubmissionReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const scope = await instructorScope(user);
  const s = await getSubmissionForReview(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!s) notFound();
  await scope.assertCourse(s.assignment.courseId).catch(() => notFound());
  const next = await prisma.assignmentSubmission.findFirst({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, NOT: { id: s.id }, assignment: { course: scope.courseWhere } }, orderBy: { submittedAt: "asc" }, select: { id: true } });
  const gradable = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUESTED"].includes(s.status);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Submissions", href: "/instructor/submissions" }, { label: s.assignment.title }]} title={s.assignment.title} description={`${s.assignment.course.title} · attempt ${s.attempt}${s.submittedAt ? ` · submitted ${formatDateTime(s.submittedAt)}` : ""}${s.isLate ? " · late" : ""}`} actions={<Badge variant={statusVariant(s.status)} className="px-3 py-1">{enumLabel(s.status)}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <section className="surface flex flex-col gap-4 p-6">
            <Link href={`/instructor/students/${s.student.id}`} className="flex items-center gap-3 hover:text-accent"><Avatar name={s.student.user.name} src={s.student.user.avatar?.url} size="md" /><div><p className="font-medium">{s.student.user.name}</p><p className="text-caption text-fg-muted">{s.student.studentNumber} · {s.student.user.email}</p></div></Link>
            {s.text ? <div className="whitespace-pre-wrap rounded-lg bg-bg-subtle p-4 text-sm">{s.text}</div> : null}
            {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"><ExternalLink className="size-4" /> {s.url}</a> : null}
            {s.files.length ? <ul className="flex flex-wrap gap-2">{s.files.map((f) => <li key={f.id}><a href={f.media.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm hover:border-accent"><Paperclip className="size-3.5" /> {f.media.fileName} <span className="text-caption text-fg-subtle">({Math.round(f.media.size / 1024)} KB)</span></a></li>)}</ul> : null}
            {s.files.some((f) => f.media.kind === "IMAGE") ? <div className="grid gap-2 sm:grid-cols-2">{s.files.filter((f) => f.media.kind === "IMAGE").map((f) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.id} src={f.media.url} alt={f.media.fileName} className="rounded-lg border border-border" />
            ))}</div> : null}
          </section>
          {s.feedback.length ? (
            <section className="surface p-5">
              <p className="text-label mb-2 text-fg-subtle">Previous feedback</p>
              {s.feedback.map((f) => <p key={f.id} className="whitespace-pre-wrap border-t border-border py-2 text-sm first:border-0">{f.body} <span className="text-caption text-fg-subtle">· {formatDateTime(f.createdAt)}</span></p>)}
            </section>
          ) : null}
          <section className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Assignment brief</p>
            {s.assignment.instructions ? <div className="prose-globify text-sm" dangerouslySetInnerHTML={{ __html: s.assignment.instructions }} /> : <p className="text-caption text-fg-muted">No written instructions.</p>}
          </section>
        </div>
        <aside className="lg:col-span-5">
          <div className="surface sticky top-20 p-6">
            {gradable ? (
              <GradingForm submissionId={s.id} kind="assignment" maxPoints={toNumber(s.assignment.maxPoints)} rubric={s.assignment.rubric ? { title: s.assignment.rubric.title, criteria: s.assignment.rubric.criteria.map((c) => ({ id: c.id, title: c.title, description: c.description, maxPoints: toNumber(c.maxPoints) })) } : null} initialScore={s.score != null ? toNumber(s.score) : null} nextHref={next ? `/instructor/submissions/${next.id}` : "/instructor/submissions"} />
            ) : (
              <div className="text-sm"><p className="font-medium">Graded{s.reviewedBy ? ` by ${s.reviewedBy.name}` : ""}</p><p className="text-fg-muted">{s.score != null ? `${toNumber(s.score)}/${toNumber(s.assignment.maxPoints)}` : "No score"} · {s.reviewedAt ? formatDateTime(s.reviewedAt) : ""}</p></div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
