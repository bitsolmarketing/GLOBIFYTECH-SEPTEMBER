import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { listProjectSubmissions } from "@/server/services/projects";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { QuizManualGrader, ExamManualGrader } from "@/components/studio/manual-grading";
import { relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Grading" };
export const dynamic = "force-dynamic";

export default async function GradingPage() {
  const user = await requireUser();
  const scope = await instructorScope(user);
  const [projects, quizAttempts, examAttempts, assignmentsCount] = await Promise.all([
    listProjectSubmissions({ instructorId: scope.bypass ? undefined : scope.instructorId }),
    prisma.quizAttempt.findMany({ where: { status: "SUBMITTED", quiz: { course: scope.courseWhere } }, orderBy: { submittedAt: "asc" }, take: 20, include: { quiz: { select: { title: true } }, student: { select: { user: { select: { name: true } } } }, answers: { where: { needsManualGrading: true }, include: { question: { select: { prompt: true, points: true } } } } } }),
    prisma.examAttempt.findMany({ where: { status: "SUBMITTED", exam: { course: scope.courseWhere } }, orderBy: { submittedAt: "asc" }, take: 20, include: { exam: { select: { title: true } }, student: { select: { user: { select: { name: true } } } } } }),
    prisma.assignmentSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, assignment: { course: scope.courseWhere } } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Grading" description="Everything that needs a human: project reviews, subjective quiz answers and exams." actions={assignmentsCount ? <Button asChild variant="secondary"><Link href="/instructor/submissions">{assignmentsCount} assignment{assignmentsCount === 1 ? "" : "s"} to grade</Link></Button> : null} />
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects ({projects.total})</TabsTrigger>
          <TabsTrigger value="quizzes">Quiz answers ({quizAttempts.length})</TabsTrigger>
          <TabsTrigger value="exams">Exams ({examAttempts.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="projects">
          {projects.items.length ? (
            <ul className="surface divide-y divide-border">
              {projects.items.map((s) => (
                <li key={s.id}><Link href={`/instructor/grading/project/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-bg-subtle"><Avatar name={s.student.user.name} src={s.student.user.avatar?.url} size="sm" /><div className="min-w-0 flex-1"><p className="truncate font-medium">{s.project.title} <span className="font-normal text-fg-muted">· {s.student.user.name}</span></p><p className="text-caption text-fg-muted">{s.project.course.title} · {s.submittedAt ? relativeTime(s.submittedAt) : ""}</p></div><Button size="sm" variant="secondary">Review</Button></Link></li>
              ))}
            </ul>
          ) : <EmptyState compact icon={<PenLine />} title="No projects waiting." />}
        </TabsContent>
        <TabsContent value="quizzes" className="flex flex-col gap-4">
          {quizAttempts.length ? quizAttempts.map((a) => (
            <div key={a.id} className="surface p-5">
              <div className="mb-3 flex items-center justify-between"><p className="font-medium">{a.quiz.title} <span className="font-normal text-fg-muted">· {a.student.user.name}</span></p><Badge variant="warning">{a.answers.length} to grade</Badge></div>
              <QuizManualGrader attemptId={a.id} answers={a.answers.map((x) => ({ questionId: x.questionId, prompt: x.question.prompt, points: toNumber(x.question.points), textAnswer: x.textAnswer }))} />
            </div>
          )) : <EmptyState compact icon={<PenLine />} title="No subjective answers waiting." />}
        </TabsContent>
        <TabsContent value="exams">
          {examAttempts.length ? (
            <ul className="surface divide-y divide-border">
              {examAttempts.map((a) => (
                <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{a.exam.title} <span className="font-normal text-fg-muted">· {a.student.user.name}</span></p><p className="text-caption text-fg-muted">Auto-scored {toNumber(a.score)}/{toNumber(a.maxScore)} · needs manual review for subjective items</p></div><ExamManualGrader attemptId={a.id} maxScore={toNumber(a.maxScore)} /></li>
              ))}
            </ul>
          ) : <EmptyState compact icon={<PenLine />} title="No exams waiting." />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
