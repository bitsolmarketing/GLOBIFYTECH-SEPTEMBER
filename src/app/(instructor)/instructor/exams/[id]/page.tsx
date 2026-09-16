import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ExamForm, toLocalInput } from "@/components/studio/assessment-forms";
import { QuestionBank } from "@/components/studio/quiz-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Exam" };
export const dynamic = "force-dynamic";

export default async function ExamEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  const [{ id }, { course }, user] = await Promise.all([params, searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const [courses, batches] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.batch.findMany({ where: { deletedAt: null, status: { in: ["PLANNED", "OPEN", "RUNNING"] }, course: scope.courseWhere }, select: { id: true, name: true, courseId: true } }),
  ]);
  if (id === "new") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: "Exams", href: "/instructor/exams" }, { label: "New" }]} title="New exam" description="Configure the exam first, then add questions." />
        <div className="surface max-w-3xl p-6">
          <ExamForm courses={courses} batches={batches} initial={{ courseId: course ?? courses[0]?.id ?? "", batchId: null, title: "", kind: "FINAL", description: "", scheduledAt: "", durationMinutes: 60, passingScore: 50, attemptLimit: 1, negativeMarking: 0, shuffleQuestions: true, isPublished: false }} />
        </div>
      </div>
    );
  }
  const exam = await prisma.exam.findUnique({ where: { id }, include: { course: { select: { title: true } }, questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } }, _count: { select: { attempts: true } } } });
  if (!exam) notFound();
  await scope.assertCourse(exam.courseId).catch(() => notFound());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Exams", href: "/instructor/exams" }, { label: exam.title }]} title={exam.title} description={`${exam.course.title} · ${exam.questions.length} questions · ${exam._count.attempts} attempts`} actions={<Badge variant={exam.isPublished ? "success" : "default"}>{exam.isPublished ? "Published" : "Draft"}</Badge>} />
      <Tabs defaultValue="questions">
        <TabsList><TabsTrigger value="questions">Questions</TabsTrigger><TabsTrigger value="settings">Settings</TabsTrigger></TabsList>
        <TabsContent value="questions">
          <QuestionBank examId={exam.id} questions={exam.questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, explanation: q.explanation, topic: q.topic, difficulty: q.difficulty, points: toNumber(q.points), codeLanguage: q.codeLanguage, codeStarter: q.codeStarter, answerKey: q.answerKey, options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, matchKey: o.matchKey })) }))} />
        </TabsContent>
        <TabsContent value="settings">
          <div className="surface max-w-3xl p-6">
            <ExamForm id={exam.id} courses={courses} batches={batches} initial={{ courseId: exam.courseId, batchId: exam.batchId, title: exam.title, kind: exam.kind, description: exam.description ?? "", scheduledAt: toLocalInput(exam.scheduledAt), durationMinutes: exam.durationMinutes, passingScore: exam.passingScore, attemptLimit: exam.attemptLimit, negativeMarking: toNumber(exam.negativeMarking), shuffleQuestions: exam.shuffleQuestions, isPublished: exam.isPublished }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
