import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { rubricsList } from "@/server/services/assignments";
import { PageHeader } from "@/components/layout/page-header";
import { ProjectForm, toLocalInput } from "@/components/studio/assessment-forms";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enumLabel, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Project" };
export const dynamic = "force-dynamic";

export default async function ProjectEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  const [{ id }, { course }, user] = await Promise.all([params, searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, rubrics] = await Promise.all([prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }), rubricsList()]);
  const rubricOpts = rubrics.map((r) => ({ id: r.id, title: r.title }));
  if (id === "new") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: "Projects", href: "/instructor/projects" }, { label: "New" }]} title="New project" />
        <div className="surface max-w-3xl p-6">
          <ProjectForm courses={courses} rubrics={rubricOpts} initial={{ courseId: course ?? courses[0]?.id ?? "", title: "", overview: "", requirements: "", skills: [], resources: [], deadline: "", maxPoints: 100, rubricId: null, addToPortfolio: true, isPublished: false, milestones: [] }} />
        </div>
      </div>
    );
  }
  const p = await prisma.project.findUnique({ where: { id }, include: { course: { select: { id: true, title: true } }, milestones: { orderBy: { order: "asc" } }, submissions: { orderBy: { submittedAt: "desc" }, take: 20, include: { student: { select: { user: { select: { name: true } } } } } } } });
  if (!p) notFound();
  await scope.assertCourse(p.courseId).catch(() => notFound());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Projects", href: "/instructor/projects" }, { label: p.title }]} title={p.title} description={p.course.title} actions={<Badge variant={p.isPublished ? "success" : "default"}>{p.isPublished ? "Published" : "Draft"}</Badge>} />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="surface p-6 lg:col-span-7">
          <ProjectForm id={p.id} courses={courses} rubrics={rubricOpts} initial={{ courseId: p.courseId, title: p.title, overview: p.overview ?? "", requirements: p.requirements ?? "", skills: p.skills, resources: (p.resources as Array<{ title: string; url: string }> | null) ?? [], deadline: toLocalInput(p.deadline), maxPoints: toNumber(p.maxPoints), rubricId: p.rubricId, addToPortfolio: p.addToPortfolio, isPublished: p.isPublished, milestones: p.milestones.map((m) => ({ id: m.id, title: m.title, description: m.description ?? "", dueAt: toLocalInput(m.dueAt) })) }} />
        </div>
        <aside className="lg:col-span-5">
          <div className="surface flex flex-col gap-3 p-5">
            <div className="flex items-center justify-between"><p className="font-medium">Submissions</p><Button asChild size="sm" variant="ghost"><Link href="/instructor/grading">Review queue</Link></Button></div>
            <ul className="divide-y divide-border">
              {p.submissions.map((s) => (
                <li key={s.id}><Link href={`/instructor/grading/project/${s.id}`} className="flex items-center justify-between gap-2 py-2 text-sm hover:text-accent"><span className="truncate">{s.student.user.name}</span><span className="flex items-center gap-2"><span className="text-caption text-fg-subtle">{s.submittedAt ? relativeTime(s.submittedAt) : "draft"}</span><Badge variant={statusVariant(s.status)}>{enumLabel(s.status)}</Badge></span></Link></li>
              ))}
              {!p.submissions.length ? <li className="py-2 text-caption text-fg-subtle">No submissions yet.</li> : null}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
