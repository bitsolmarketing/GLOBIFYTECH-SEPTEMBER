import type { Metadata } from "next";
import { ListChecks } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { AssessmentList } from "@/components/studio/assessment-list";

export const metadata: Metadata = { title: "Quizzes" };
export const dynamic = "force-dynamic";

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ course?: string }> }) {
  const [{ course }, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, quizzes] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.quiz.findMany({ where: { course: { deletedAt: null, ...scope.courseWhere }, ...(course ? { courseId: course } : {}) }, orderBy: { updatedAt: "desc" }, include: { course: { select: { id: true, title: true } }, _count: { select: { questions: true, attempts: true } } } }),
  ]);
  return (
    <AssessmentList
      title="Quizzes"
      description="Question banks with auto-grading, randomisation, timers and weak-topic analysis."
      base="/instructor/quizzes"
      icon={<ListChecks />}
      courses={courses}
      activeCourse={course}
      rows={quizzes.map((q) => ({ id: q.id, title: q.title, course: q.course, meta: `${q._count.questions} questions · ${q._count.attempts} attempts · pass ${q.passingScore}%${q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ""}`, isPublished: q.isPublished }))}
    />
  );
}
