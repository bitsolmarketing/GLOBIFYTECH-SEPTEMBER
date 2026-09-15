import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { quizzesForStudent } from "@/server/services/quizzes";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StartQuizButton } from "@/components/lms/start-buttons";

export const metadata: Metadata = { title: "Quizzes" };
export const dynamic = "force-dynamic";

export default async function QuizzesPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const [{ start }, { studentId }] = await Promise.all([searchParams, requireStudentProfile()]);
  const quizzes = await quizzesForStudent(studentId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Quizzes" description="Short checks after lessons. Weak topics come with recommended lessons." />
      {quizzes.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {quizzes.map((q) => {
            const attemptsLeft = q.attemptLimit - q.attemptsUsed;
            return (
              <li key={q.id} className="surface flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-h4 truncate">{q.title}</h2>
                    <p className="text-caption text-fg-muted">{q.course.title} · {q._count.questions} questions{q.timeLimitMinutes ? ` · ${q.timeLimitMinutes} min` : ""} · pass at {q.passingScore}%</p>
                  </div>
                  {q.passed ? <Badge variant="success">Passed</Badge> : q.bestPercent != null ? <Badge variant="warning">Best {q.bestPercent}%</Badge> : <Badge>New</Badge>}
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="text-caption text-fg-subtle">{q.attemptsUsed}/{q.attemptLimit} attempts used</span>
                  {q.inProgress ? (
                    <Button asChild size="sm"><Link href={`/student/quizzes/attempt/${q.inProgress.id}`}>Resume</Link></Button>
                  ) : attemptsLeft > 0 && !q.passed ? (
                    <StartQuizButton quizId={q.id} size="sm" autoStart={start === q.id} label={q.attemptsUsed ? "Try again" : "Start"} />
                  ) : q.attempts[0] ? (
                    <Button asChild size="sm" variant="secondary"><Link href={`/student/quizzes/attempt/${q.attempts[0].id}`}>Review</Link></Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<ListChecks />} title="No quizzes yet." description="Quizzes unlock as your instructor publishes them." />
      )}
    </div>
  );
}
