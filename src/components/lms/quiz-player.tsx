"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Check, X, ArrowRight, ArrowLeft, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { submitQuizAction, submitExamAction } from "@/server/actions/student";

export interface PlayerQuestion {
  id: string;
  type: string;
  prompt: string;
  image?: { url: string; alt: string | null } | null;
  codeLanguage?: string | null;
  codeStarter?: string | null;
  points: number;
  topic?: string | null;
  explanation?: string | null;
  options: Array<{ id: string; text: string; matchKey?: string | null; isCorrect?: boolean }>;
}

export interface QuizPlayerProps {
  mode: "quiz" | "exam";
  attemptId: string;
  title: string;
  questions: PlayerQuestion[];
  expiresAt: string | null;
  status: string;
  passingScore: number;
  result?: { percent: number; passed: boolean; score: number; maxScore: number; weakTopics: string[]; answers: Record<string, { selectedOptionIds: string[]; textAnswer: string | null; structured: unknown; isCorrect: boolean | null }>; recommended?: Array<{ id: string; title: string }>; needsManualGrading: boolean; courseId?: string } | null;
  backHref: string;
}

type Answer = { selectedOptionIds?: string[]; textAnswer?: string | null; structured?: unknown };
type QuizSubmitData = { percent: number; passed: boolean; score: number; maxScore: number; weakTopics: string[]; needsManualGrading: boolean; recommended: Array<{ id: string; title: string }>; answers: Array<{ questionId: string; isCorrect: boolean | null }> };

function useCountdown(expiresAt: string | null, onExpire: () => void) {
  const [left, setLeft] = React.useState(() => (expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null));
  React.useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        onExpire();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt, onExpire]);
  return left;
}

export function QuizPlayer({ mode, attemptId, title, questions, expiresAt, status, passingScore, result, backHref }: QuizPlayerProps) {
  const router = useRouter();
  const [index, setIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, Answer>>(() => (result ? Object.fromEntries(Object.entries(result.answers).map(([k, v]) => [k, { selectedOptionIds: v.selectedOptionIds, textAnswer: v.textAnswer, structured: v.structured }])) : {}));
  const [flags, setFlags] = React.useState<Set<string>>(new Set());
  const [pending, start] = React.useTransition();
  const [outcome, setOutcome] = React.useState(result ?? null);
  const finished = !!outcome || status !== "IN_PROGRESS";

  const submit = React.useCallback(
    (auto = false) => {
      if (finished) return;
      if (!auto) {
        const unanswered = questions.filter((q) => !answers[q.id]).length;
        if (unanswered && !window.confirm(`${unanswered} question${unanswered === 1 ? "" : "s"} unanswered. Submit anyway?`)) return;
      }
      start(async () => {
        const payload = { attemptId, answers: questions.map((q) => ({ questionId: q.id, selectedOptionIds: answers[q.id]?.selectedOptionIds ?? [], textAnswer: answers[q.id]?.textAnswer ?? null, structured: answers[q.id]?.structured })) };
        const res = mode === "quiz" ? await submitQuizAction(payload) : await submitExamAction(payload);
        if (!res.ok) {
          toast.error(res.error.message);
          if (res.error.code === "VALIDATION" || res.error.code === "CONFLICT") router.refresh();
          return;
        }
        if (mode === "quiz") {
          const r = res.data as unknown as QuizSubmitData;
          setOutcome({ percent: r.percent, passed: r.passed, score: r.score, maxScore: r.maxScore, weakTopics: r.weakTopics, needsManualGrading: r.needsManualGrading, recommended: r.recommended, answers: Object.fromEntries(r.answers.map((a) => [a.questionId, { selectedOptionIds: answers[a.questionId]?.selectedOptionIds ?? [], textAnswer: answers[a.questionId]?.textAnswer ?? null, structured: answers[a.questionId]?.structured, isCorrect: a.isCorrect }])) });
        } else {
          const r = res.data as { percent: number; passed: boolean; needsManualGrading: boolean };
          setOutcome({ percent: r.percent, passed: r.passed, score: 0, maxScore: 0, weakTopics: [], needsManualGrading: r.needsManualGrading, answers: {} });
        }
        router.refresh();
      });
    },
    [finished, questions, answers, attemptId, mode, router],
  );

  const left = useCountdown(finished ? null : expiresAt, () => submit(true));
  const q = questions[index]!;
  const a = answers[q.id] ?? {};
  const set = (patch: Answer) => setAnswers((s) => ({ ...s, [q.id]: { ...s[q.id], ...patch } }));
  const answered = questions.filter((x) => answers[x.id] && ((answers[x.id]!.selectedOptionIds?.length ?? 0) > 0 || answers[x.id]!.textAnswer || answers[x.id]!.structured)).length;

  if (outcome) {
    const reveal = mode === "quiz";
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className={cn("surface-raised flex flex-col items-center gap-3 p-8 text-center", outcome.passed ? "border-success/30" : "")}>
          <span className={cn("flex size-16 items-center justify-center rounded-full", outcome.needsManualGrading ? "bg-warning-soft text-warning" : outcome.passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
            {outcome.needsManualGrading ? <Clock className="size-8" /> : outcome.passed ? <Check className="size-8" /> : <X className="size-8" />}
          </span>
          <h1 className="text-h2">{outcome.needsManualGrading ? "Submitted for grading" : outcome.passed ? "You passed" : "Not quite yet"}</h1>
          <p className="text-h1 tabular-nums">{Math.round(outcome.percent)}%</p>
          <p className="text-body-sm text-fg-muted">{outcome.needsManualGrading ? "Some answers need an instructor's review. Your score will update once graded." : `Pass mark ${passingScore}%${outcome.maxScore ? ` · ${outcome.score}/${outcome.maxScore} points` : ""}`}</p>
          {outcome.weakTopics.length ? (
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              <span className="text-caption text-fg-muted">Weak topics:</span>
              {outcome.weakTopics.map((t) => <Badge key={t} variant="warning">{t}</Badge>)}
            </div>
          ) : null}
          {outcome.recommended?.length && outcome.courseId ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {outcome.recommended.map((l) => (
                <Button key={l.id} asChild size="sm" variant="secondary"><Link href={`/student/course/${outcome.courseId}?lesson=${l.id}`}>Review: {l.title}</Link></Button>
              ))}
            </div>
          ) : null}
          <Button asChild className="mt-3"><Link href={backHref}>Back to {mode === "quiz" ? "quizzes" : "exams"}</Link></Button>
        </div>
        {reveal ? (
          <ol className="flex flex-col gap-3">
            {questions.map((qq, i) => {
              const ans = outcome.answers[qq.id];
              return (
                <li key={qq.id} className={cn("surface p-5", ans?.isCorrect === true ? "border-success/30" : ans?.isCorrect === false ? "border-danger/30" : "")}>
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="font-medium"><span className="me-2 text-fg-subtle">{i + 1}.</span>{qq.prompt}</p>
                    {ans?.isCorrect === true ? <Badge variant="success">Correct</Badge> : ans?.isCorrect === false ? <Badge variant="danger">Incorrect</Badge> : <Badge>Pending</Badge>}
                  </div>
                  {qq.options.length ? (
                    <ul className="flex flex-col gap-1 text-sm">
                      {qq.options.map((o) => {
                        const chosen = ans?.selectedOptionIds.includes(o.id);
                        return (
                          <li key={o.id} className={cn("rounded-md px-3 py-1.5", o.isCorrect ? "bg-success-soft text-success" : chosen ? "bg-danger-soft text-danger" : "text-fg-muted")}>
                            {o.text}{chosen ? " (your answer)" : ""}
                          </li>
                        );
                      })}
                    </ul>
                  ) : ans?.textAnswer ? <p className="text-sm text-fg-muted">Your answer: {ans.textAnswer}</p> : null}
                  {qq.explanation ? <p className="mt-2 text-body-sm text-fg-muted"><span className="font-medium text-fg">Why:</span> {qq.explanation}</p> : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-label text-fg-subtle">{mode === "quiz" ? "Quiz" : "Exam"}</p>
          <h1 className="text-h3">{title}</h1>
        </div>
        {left != null ? (
          <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-sm tabular-nums", left < 60 ? "border-danger/40 bg-danger-soft text-danger" : "border-border bg-surface")} aria-live="polite">
            <Clock className="size-4" /> {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Progress value={(answered / questions.length) * 100} size="sm" />
        <span className="text-caption tabular-nums text-fg-muted">{answered}/{questions.length}</span>
      </div>

      <div className="surface flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-caption text-fg-subtle">Question {index + 1} of {questions.length} · {q.points} pt{q.points === 1 ? "" : "s"}{q.topic ? ` · ${q.topic}` : ""}</p>
          <button type="button" onClick={() => setFlags((f) => { const n = new Set(f); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })} className={cn("inline-flex items-center gap-1 text-caption", flags.has(q.id) ? "text-warning" : "text-fg-subtle hover:text-fg")}>
            <Flag className="size-3.5" /> {flags.has(q.id) ? "Flagged" : "Flag"}
          </button>
        </div>
        <p className="text-body-lg font-medium">{q.prompt}</p>
        {q.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.image.url} alt={q.image.alt ?? ""} className="max-h-80 w-auto rounded-lg border border-border" />
        ) : null}

        {q.type === "MULTIPLE_CHOICE" || q.type === "TRUE_FALSE" || q.type === "IMAGE" ? (
          <div className="flex flex-col gap-2" role="radiogroup">
            {q.options.map((o) => {
              const on = a.selectedOptionIds?.[0] === o.id;
              return (
                <button key={o.id} type="button" role="radio" aria-checked={on} onClick={() => set({ selectedOptionIds: [o.id] })} className={cn("flex items-center gap-3 rounded-lg border p-3 text-start text-sm transition-colors", on ? "border-accent bg-accent-soft/40" : "border-border hover:border-border-strong")}>
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", on ? "border-accent bg-accent text-white" : "border-border-strong")}>{on ? <Check className="size-3" /> : null}</span>
                  {o.text}
                </button>
              );
            })}
          </div>
        ) : q.type === "MULTIPLE_SELECT" ? (
          <div className="flex flex-col gap-2">
            {q.options.map((o) => {
              const on = a.selectedOptionIds?.includes(o.id) ?? false;
              return (
                <button key={o.id} type="button" role="checkbox" aria-checked={on} onClick={() => set({ selectedOptionIds: on ? (a.selectedOptionIds ?? []).filter((x) => x !== o.id) : [...(a.selectedOptionIds ?? []), o.id] })} className={cn("flex items-center gap-3 rounded-lg border p-3 text-start text-sm transition-colors", on ? "border-accent bg-accent-soft/40" : "border-border hover:border-border-strong")}>
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border", on ? "border-accent bg-accent text-white" : "border-border-strong")}>{on ? <Check className="size-3" /> : null}</span>
                  {o.text}
                </button>
              );
            })}
            <p className="text-caption text-fg-subtle">Select all that apply.</p>
          </div>
        ) : q.type === "SHORT_ANSWER" || q.type === "FILL_BLANK" ? (
          <Input value={a.textAnswer ?? ""} onChange={(e) => set({ textAnswer: e.target.value })} placeholder="Your answer" />
        ) : q.type === "LONG_ANSWER" ? (
          <Textarea rows={6} value={a.textAnswer ?? ""} onChange={(e) => set({ textAnswer: e.target.value })} placeholder="Write your answer…" />
        ) : q.type === "CODE" ? (
          <Textarea rows={12} value={a.textAnswer ?? q.codeStarter ?? ""} onChange={(e) => set({ textAnswer: e.target.value })} className="font-mono text-[13px]" spellCheck={false} placeholder={`// ${q.codeLanguage ?? "code"}`} />
        ) : q.type === "ORDERING" ? (
          <OrderingInput options={q.options} value={(a.structured as string[] | undefined) ?? q.options.map((o) => o.id)} onChange={(v) => set({ structured: v })} />
        ) : q.type === "MATCHING" ? (
          <MatchingInput options={q.options} value={(a.structured as Record<string, string> | undefined) ?? {}} onChange={(v) => set({ structured: v })} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
          <ArrowLeft className="rtl:rotate-180" /> Previous
        </Button>
        <div className="flex flex-wrap gap-1">
          {questions.map((qq, i) => (
            <button key={qq.id} type="button" onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`} className={cn("size-7 rounded-md text-caption font-medium", i === index ? "bg-accent text-white" : answers[qq.id] ? "bg-success-soft text-success" : flags.has(qq.id) ? "bg-warning-soft text-warning" : "bg-bg-muted text-fg-muted")}>
              {i + 1}
            </button>
          ))}
        </div>
        {index < questions.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)}>
            Next <ArrowRight className="rtl:rotate-180" />
          </Button>
        ) : (
          <Button onClick={() => submit()} loading={pending}>
            Submit {mode}
          </Button>
        )}
      </div>
    </div>
  );
}

function OrderingInput({ options, value, onChange }: { options: PlayerQuestion["options"]; value: string[]; onChange: (v: string[]) => void }) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = value.slice();
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };
  return (
    <ol className="flex flex-col gap-2">
      {value.map((id, i) => {
        const o = options.find((x) => x.id === id);
        return (
          <li key={id} className="flex items-center gap-3 rounded-lg border border-border p-2.5 text-sm">
            <span className="w-6 text-center text-caption text-fg-subtle">{i + 1}</span>
            <span className="flex-1">{o?.text}</span>
            <Button size="sm" variant="ghost" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up">↑</Button>
            <Button size="sm" variant="ghost" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label="Move down">↓</Button>
          </li>
        );
      })}
    </ol>
  );
}

function MatchingInput({ options, value, onChange }: { options: PlayerQuestion["options"]; value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  const keys = [...new Set(options.map((o) => o.matchKey).filter((x): x is string => !!x))];
  return (
    <ul className="flex flex-col gap-2">
      {options.map((o) => (
        <li key={o.id} className="grid items-center gap-3 sm:grid-cols-2">
          <span className="text-sm">{o.text}</span>
          <select value={value[o.id] ?? ""} onChange={(e) => onChange({ ...value, [o.id]: e.target.value })} className="h-10 rounded-md border border-border bg-surface px-3 text-sm">
            <option value="">Choose…</option>
            {keys.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </li>
      ))}
    </ul>
  );
}
