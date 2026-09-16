import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { rubricsList } from "@/server/services/assignments";
import { PageHeader } from "@/components/layout/page-header";
import { AssignmentForm, toLocalInput } from "@/components/studio/assessment-forms";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enumLabel, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Assignment" };
export const dynamic = "force-dynamic";

export default async function AssignmentEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  const [{ id }, { course }, user] = await Promise.all([params, searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, rubrics] = await Promise.all([prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }), rubricsList()]);
  const rubricOpts = rubrics.map((r) => ({ id: r.id, title: r.title }));

  if (id === "new") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: "Assignments", href: "/instructor/assignments" }, { label: "New" }]} title="New assignment" />
        <div className="surface max-w-3xl p-6">
          <AssignmentForm courses={courses} rubrics={rubricOpts} initial={{ courseId: course ?? courses[0]?.id ?? "", title: "", instructions: "", allowedKinds: ["TEXT", "FILE", "URL"], maxPoints: 100, dueAt: "", allowLate: true, latePenaltyPercent: 0, rubricId: null, isPublished: false }} />
        </div>
      </div>
    );
  }

  const a = await prisma.assignment.findUnique({ where: { id }, include: { course: { select: { id: true, title: true } }, submissions: { orderBy: { submittedAt: "desc" }, take: 20, include: { student: { select: { user: { select: { name: true } } } } } } } });
  if (!a) notFound();
  await scope.assertCourse(a.courseId).catch(() => notFound());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Assignments", href: "/instructor/assignments" }, { label: a.title }]} title={a.title} description={a.course.title} actions={<Badge variant={a.isPublished ? "success" : "default"}>{a.isPublished ? "Published" : "Draft"}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="surface p-6 lg:col-span-7">
          <AssignmentForm id={a.id} courses={courses} rubrics={rubricOpts} initial={{ courseId: a.courseId, title: a.title, instructions: a.instructions ?? "", allowedKinds: a.allowedKinds, maxPoints: toNumber(a.maxPoints), dueAt: toLocalInput(a.dueAt), allowLate: a.allowLate, latePenaltyPercent: a.latePenaltyPercent, rubricId: a.rubricId, isPublished: a.isPublished }} />
        </div>
        <aside className="lg:col-span-5">
          <div className="surface flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between"><p className="font-medium">Recent submissions</p><Button asChild size="sm" variant="ghost"><Link href={`/instructor/submissions?course=${a.courseId}`}>Queue</Link></Button></div>
            <ul className="divide-y divide-border">
              {a.submissions.map((s) => (
                <li key={s.id}><Link href={`/instructor/submissions/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-accent"><span className="truncate">{s.student.user.name}</span><span className="flex items-center gap-2"><span className="text-caption text-fg-subtle">{s.submittedAt ? relativeTime(s.submittedAt) : "draft"}</span><Badge variant={statusVariant(s.status)}>{enumLabel(s.status)}</Badge></span></Link></li>
              ))}
              {!a.submissions.length ? <li className="py-2 text-caption text-fg-subtle">No submissions yet.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
