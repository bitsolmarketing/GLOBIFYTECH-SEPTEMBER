import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { getQuizForEditing } from "@/server/services/quizzes";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { QuizSettingsForm, QuestionBank } from "@/components/studio/quiz-editor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Quiz" };
export const dynamic = "force-dynamic";

export default async function QuizEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ course?: string }> }) {
  const [{ id }, { course }, user] = await Promise.all([params, searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const courses = await prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } });

  if (id === "new") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader breadcrumbs={[{ label: "Quizzes", href: "/instructor/quizzes" }, { label: "New quiz" }]} title="New quiz" description="Set the rules first; add questions after the quiz is created." />
        <div className="surface max-w-3xl p-6">
          <QuizSettingsForm courses={courses} initial={{ courseId: course ?? courses[0]?.id ?? "", title: "", description: "", timeLimitMinutes: null, attemptLimit: 3, passingScore: 60, negativeMarking: 0, shuffleQuestions: true, shuffleOptions: true, questionsPerAttempt: null, showAnswersAfter: true, isPublished: false, availableFrom: "", availableTo: "" }} />
        </div>
      </div>
    );
  }

  const quiz = await getQuizForEditing(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!quiz) notFound();
  await scope.assertCourse(quiz.courseId).catch(() => notFound());
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Quizzes", href: "/instructor/quizzes" }, { label: quiz.title }]} title={quiz.title} description={`${quiz.course.title} · ${quiz.questions.length} questions · ${quiz._count.attempts} attempts${quiz.lesson ? ` · linked to lesson "${quiz.lesson.title}"` : " · not linked to a lesson yet"}`} actions={<Badge variant={quiz.isPublished ? "success" : "default"}>{quiz.isPublished ? "Published" : "Draft"}</Badge>} />
      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="questions">
          <QuestionBank quizId={quiz.id} questions={quiz.questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, explanation: q.explanation, topic: q.topic, difficulty: q.difficulty, points: toNumber(q.points), codeLanguage: q.codeLanguage, codeStarter: q.codeStarter, answerKey: q.answerKey, options: q.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect, matchKey: o.matchKey })) }))} />
        </TabsContent>
        <TabsContent value="settings">
          <div className="surface max-w-3xl p-6">
            <QuizSettingsForm id={quiz.id} courses={courses} initial={{ courseId: quiz.courseId, title: quiz.title, description: quiz.description ?? "", timeLimitMinutes: quiz.timeLimitMinutes, attemptLimit: quiz.attemptLimit, passingScore: quiz.passingScore, negativeMarking: toNumber(quiz.negativeMarking), shuffleQuestions: quiz.shuffleQuestions, shuffleOptions: quiz.shuffleOptions, questionsPerAttempt: quiz.questionsPerAttempt, showAnswersAfter: quiz.showAnswersAfter, isPublished: quiz.isPublished, availableFrom: quiz.availableFrom ? quiz.availableFrom.toISOString().slice(0, 16) : "", availableTo: quiz.availableTo ? quiz.availableTo.toISOString().slice(0, 16) : "" }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
