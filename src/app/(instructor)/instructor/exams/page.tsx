import type { Metadata } from "next";
import { FileCheck2 } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { AssessmentList } from "@/components/studio/assessment-list";
import { enumLabel, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Exams" };
export const dynamic = "force-dynamic";

export default async function ExamsPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, rows] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.exam.findMany({ where: { course: { deletedAt: null, ...scope.courseWhere }, ...(course ? { courseId: course } : {}) }, orderBy: [{ scheduledAt: "desc" }], include: { course: { select: { id: true, title: true } }, batch: { select: { name: true } }, _count: { select: { questions: true, attempts: true } } } }),
  ]);
  return (
    <AssessmentList
      title="Exams"
      description="Timed midterms, finals, practicals and mocks with a shared question bank."
      base="/instructor/exams"
      icon={<FileCheck2 />}
      courses={courses}
      activeCourse={course}
      rows={rows.map((e) => ({ id: e.id, title: e.title, course: e.course, meta: `${enumLabel(e.kind)} · ${e._count.questions} questions · ${e.durationMinutes} min${e.batch ? ` · ${e.batch.name}` : ""}${e.scheduledAt ? ` · ${formatDateTime(e.scheduledAt)}` : ""}`, isPublished: e.isPublished, extra: e._count.attempts ? `${e._count.attempts} attempts` : undefined }))}
    />
  );
}
