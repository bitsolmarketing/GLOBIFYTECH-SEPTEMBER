"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { gradeQuizAnswersAction, gradeExamAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";

export function QuizManualGrader({ attemptId, answers }: { attemptId: string; answers: Array<{ questionId: string; prompt: string; points: number; textAnswer: string | null }> }) {
  const router = useRouter();
  const [grades, setGrades] = React.useState(answers.map((a) => ({ questionId: a.questionId, pointsAwarded: 0, graderNote: "" })));
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-4">
      {answers.map((a, i) => (
        <div key={a.questionId} className="rounded-lg border border-border p-4">
          <p className="text-sm font-medium">{a.prompt}</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-bg-subtle p-3 font-mono text-[13px]">{a.textAnswer ?? "(no answer)"}</pre>
          <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
            <div className="flex items-center gap-1 text-sm"><Input type="number" min={0} max={a.points} step={0.5} value={grades[i]!.pointsAwarded} onChange={(e) => setGrades(grades.map((g, j) => (j === i ? { ...g, pointsAwarded: Math.min(a.points, Math.max(0, Number(e.target.value))) } : g)))} className="h-9 w-20" aria-label="Points" /><span className="text-fg-muted">/ {a.points}</span></div>
            <Textarea rows={1} value={grades[i]!.graderNote} onChange={(e) => setGrades(grades.map((g, j) => (j === i ? { ...g, graderNote: e.target.value } : g)))} placeholder="Note for the student (optional)" className="min-h-9" />
          </div>
        </div>
      ))}
      <Button className="w-fit" loading={pending} onClick={() => start(async () => { const res = await gradeQuizAnswersAction(attemptId, grades); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Graded."); router.refresh(); })}>Save grades</Button>
    </div>
  );
}

export function ExamManualGrader({ attemptId, maxScore }: { attemptId: string; maxScore: number }) {
  const router = useRouter();
  const [score, setScore] = React.useState(0);
  const [pending, start] = React.useTransition();
  return (
    <div className="flex items-center gap-2">
      <Input type="number" min={0} max={maxScore} step={0.5} value={score} onChange={(e) => setScore(Number(e.target.value))} className="h-9 w-24" aria-label="Final score" />
      <span className="text-sm text-fg-muted">/ {maxScore}</span>
      <Button size="sm" loading={pending} onClick={() => start(async () => { const res = await gradeExamAction(attemptId, score); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Exam graded."); router.refresh(); })}>Save</Button>
    </div>
  );
}
