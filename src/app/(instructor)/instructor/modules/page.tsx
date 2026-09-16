import type { Metadata } from "next";
import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Modules" };
export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const courses = await prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true, status: true, modules: { orderBy: { order: "asc" }, select: { id: true, title: true, isPublished: true, _count: { select: { units: true } }, units: { select: { _count: { select: { lessons: true } } } } } } } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Modules" description="Every module across your courses. Edit structure from the course's curriculum tab." />
      {courses.length ? (
        courses.map((c) => (
          <section key={c.id} className="surface overflow-hidden">
            <div className="flex items-center justify-between border-b border-border bg-bg-subtle px-4 py-2.5">
              <Link href={`/instructor/course/${c.id}`} className="font-medium hover:text-accent">{c.title}</Link>
              <Link href={`/instructor/course/${c.id}?tab=curriculum`} className="inline-flex items-center gap-1 text-caption text-accent">Edit curriculum <ArrowRight className="size-3 rtl:rotate-180" /></Link>
            </div>
            <ul className="divide-y divide-border">
              {c.modules.map((m, i) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-6 text-caption text-fg-subtle">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex-1">{m.title}</span>
                  <span className="text-caption text-fg-muted">{m._count.units} units · {m.units.reduce((s, u) => s + u._count.lessons, 0)} lessons</span>
                  {!m.isPublished ? <Badge>Hidden</Badge> : null}
                </li>
              ))}
              {!c.modules.length ? <li className="px-4 py-3 text-caption text-fg-subtle">No modules yet.</li> : null}
            </ul>
          </section>
        ))
      ) : (
        <EmptyState icon={<Layers />} title="No courses assigned yet." />
      )}
    </div>
  );
}
