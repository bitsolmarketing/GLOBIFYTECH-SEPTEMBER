"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, X } from "lucide-react";
import { gradeSubmissionAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";

export function GradingForm({ submissionId, kind, maxPoints, rubric, initialScore, nextHref }: { submissionId: string; kind: "assignment" | "project"; maxPoints: number; rubric: { title: string; criteria: Array<{ id: string; title: string; description: string | null; maxPoints: number }> } | null; initialScore: number | null; nextHref?: string | null }) {
  const router = useRouter();
  const [scores, setScores] = React.useState<Record<string, { points: number; comment: string }>>(Object.fromEntries((rubric?.criteria ?? []).map((c) => [c.id, { points: c.maxPoints, comment: "" }])));
  const [score, setScore] = React.useState<number | "">(initialScore ?? "");
  const [feedback, setFeedback] = React.useState("");
  const [pending, start] = React.useTransition();
  const rubricTotal = rubric ? Object.values(scores).reduce((s, x) => s + x.points, 0) : null;
  const rubricMax = rubric ? rubric.criteria.reduce((s, c) => s + c.maxPoints, 0) : null;
  const computed = rubric && rubricMax ? Math.round(((rubricTotal ?? 0) / rubricMax) * maxPoints * 100) / 100 : null;

  const decide = (decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED") =>
    start(async () => {
      const res = await gradeSubmissionAction({ submissionId, decision, score: rubric ? computed : score === "" ? null : Number(score), feedback, rubricScores: rubric ? rubric.criteria.map((c) => ({ criterionId: c.id, points: scores[c.id]?.points ?? 0, comment: scores[c.id]?.comment ?? "" })) : [] }, kind);
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(decision === "APPROVED" ? "Approved and student notified." : decision === "REVISION_REQUESTED" ? "Revision requested." : "Marked as rejected.");
      if (nextHref) router.push(nextHref);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      {rubric ? (
        <div className="flex flex-col gap-3">
          <p className="text-label text-fg-subtle">Rubric · {rubric.title}</p>
          {rubric.criteria.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-medium">{c.title}</p>{c.description ? <p className="text-caption text-fg-muted">{c.description}</p> : null}</div>
                <div className="flex items-center gap-1 text-sm"><Input type="number" min={0} max={c.maxPoints} step={0.5} value={scores[c.id]?.points ?? 0} onChange={(e) => setScores({ ...scores, [c.id]: { ...scores[c.id]!, points: Math.min(c.maxPoints, Math.max(0, Number(e.target.value))) } })} className="h-8 w-20 text-end" aria-label={`${c.title} points`} /><span className="text-fg-muted">/ {c.maxPoints}</span></div>
              </div>
              <Input value={scores[c.id]?.comment ?? ""} onChange={(e) => setScores({ ...scores, [c.id]: { ...scores[c.id]!, comment: e.target.value } })} placeholder="Comment (optional)" className="mt-2 h-8" />
            </div>
          ))}
          <p className="text-end text-sm">Rubric {rubricTotal}/{rubricMax} → <span className="font-semibold">{computed}/{maxPoints}</span></p>
        </div>
      ) : (
        <Field label={`Score (out of ${maxPoints})`} htmlFor="g-score"><Input id="g-score" type="number" min={0} max={maxPoints} step={0.5} value={score} onChange={(e) => setScore(e.target.value === "" ? "" : Number(e.target.value))} /></Field>
      )}
      <Field label="Feedback" htmlFor="g-fb" hint="Specific and kind. The student sees this immediately."><Textarea id="g-fb" rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => decide("APPROVED")} loading={pending}><Check /> Approve</Button>
        <Button variant="secondary" onClick={() => decide("REVISION_REQUESTED")} loading={pending}><RotateCcw /> Request revision</Button>
        <Button variant="ghost" onClick={() => decide("REJECTED")} loading={pending}><X /> Reject</Button>
      </div>
    </div>
  );
}
