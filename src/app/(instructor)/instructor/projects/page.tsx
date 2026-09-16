import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { AssessmentList } from "@/components/studio/assessment-list";
import { formatDate, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, rows] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.project.findMany({ where: { course: { deletedAt: null, ...scope.courseWhere }, ...(course ? { courseId: course } : {}) }, orderBy: { updatedAt: "desc" }, include: { course: { select: { id: true, title: true } }, _count: { select: { milestones: true, submissions: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } } } } } }),
  ]);
  return (
    <AssessmentList
      title="Projects"
      description="Milestone-based real work. Approved projects flow into student portfolios."
      base="/instructor/projects"
      icon={<FolderKanban />}
      courses={courses}
      activeCourse={course}
      rows={rows.map((p) => ({ id: p.id, title: p.title, course: p.course, meta: `${p._count.milestones} milestones · ${toNumber(p.maxPoints)} pts${p.deadline ? ` · deadline ${formatDate(p.deadline)}` : ""}`, isPublished: p.isPublished, extra: p._count.submissions ? `${p._count.submissions} to review` : undefined }))}
    />
  );
}
