import type { Metadata } from "next";
import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { COURSE_CARD_SELECT } from "@/server/services/courses";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { enumLabel, formatDate } from "@/lib/utils";
import { can } from "@/lib/rbac";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

export default async function InstructorCoursesPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const courses = await prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { updatedAt: "desc" }, select: { ...COURSE_CARD_SELECT, updatedAt: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } }, modules: true, batches: { where: { status: "RUNNING" } } } } } });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Courses" description={scope.bypass ? "All courses in the catalogue." : "Courses you teach."} actions={can(user, "courses.create") ? <Button asChild><Link href="/instructor/course-builder"><Plus /> New course</Link></Button> : null} />
      {courses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/instructor/course/${c.id}`} className="surface surface-hover flex flex-col overflow-hidden">
              <div className="aspect-[16/7] bg-bg-muted"><CourseArtwork artworkKey={c.category?.artworkKey} seed={c.slug} title={c.title} imageUrl={c.artwork?.url} /></div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-h4 line-clamp-2">{c.title}</h2>
                  <Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge>
                </div>
                <p className="text-caption text-fg-muted">{c._count.modules} modules · {c._count.enrollments} active students · {c._count.batches} running batches</p>
                <p className="mt-auto text-caption text-fg-subtle">Updated {formatDate(c.updatedAt)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={<BookOpen />} title="No courses yet." description={scope.bypass ? "Create the first course." : "Ask an academic manager to assign you to a course, or create one."} action={can(user, "courses.create") ? <Button asChild><Link href="/instructor/course-builder">Create a course</Link></Button> : undefined} />
      )}
    </div>
  );
}
