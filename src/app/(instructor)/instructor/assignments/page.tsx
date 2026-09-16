import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { AssessmentList } from "@/components/studio/assessment-list";
import { formatDate, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Assignments" };
export const dynamic = "force-dynamic";

export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, rows] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.assignment.findMany({ where: { course: { deletedAt: null, ...scope.courseWhere }, ...(course ? { courseId: course } : {}) }, orderBy: { updatedAt: "desc" }, include: { course: { select: { id: true, title: true } }, _count: { select: { submissions: { where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } } } } } }),
  ]);
  return (
    <AssessmentList
      title="Assignments"
      description="Rubric-graded work with text, file, link, GitHub or live-site submissions."
      base="/instructor/assignments"
      icon={<ClipboardList />}
      courses={courses}
      activeCourse={course}
      rows={rows.map((a) => ({ id: a.id, title: a.title, course: a.course, meta: `${toNumber(a.maxPoints)} pts${a.dueAt ? ` · due ${formatDate(a.dueAt)}` : ""}`, isPublished: a.isPublished, extra: a._count.submissions ? `${a._count.submissions} to grade` : undefined }))}
    />
  );
}
