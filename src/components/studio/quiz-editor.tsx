"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check } from "lucide-react";
import { saveQuizAction, deleteQuizAction, saveQuestionAction, deleteQuestionAction } from "@/server/actions/instructor";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel } from "@/lib/utils";

export interface EditorQuestion {
  id: string;
  type: string;
  prompt: string;
  explanation: string | null;
  topic: string | null;
  difficulty: string;
  points: number;
  codeLanguage: string | null;
  codeStarter: string | null;
  answerKey: unknown;
  options: Array<{ id: string; text: string; isCorrect: boolean; matchKey: string | null }>;
}

export interface QuizSettings { courseId: string; title: string; description: string; timeLimitMinutes: number | null; attemptLimit: number; passingScore: number; negativeMarking: number; shuffleQuestions: boolean; shuffleOptions: boolean; questionsPerAttempt: number | null; showAnswersAfter: boolean; isPublished: boolean; availableFrom: string; availableTo: string }

const TYPES = [["MULTIPLE_CHOICE", "Multiple choice"], ["MULTIPLE_SELECT", "Multiple select"], ["TRUE_FALSE", "True / false"], ["SHORT_ANSWER", "Short answer"], ["LONG_ANSWER", "Long answer (manual)"], ["FILL_BLANK", "Fill in the blank"], ["MATCHING", "Matching"], ["ORDERING", "Ordering"], ["IMAGE", "Image-based"], ["CODE", "Code (manual)"]] as const;

export function QuizSettingsForm({ id, initial, courses }: { id?: string; initial: QuizSettings; courses: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveQuizAction({ ...form, availableFrom: form.availableFrom ? new Date(form.availableFrom) : null, availableTo: form.availableTo ? new Date(form.availableTo) : null }, id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Quiz saved.");
      if (!id) router.push(`/instructor/quizzes/${res.data.id}`);
      else router.refresh();
    });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="q-course" error={errors.courseId}><SimpleSelect value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v })} options={courses.map((c) => ({ value: c.id, label: c.title }))} placeholder="Choose a course" disabled={!!id} /></Field>
        <Field label="Title" htmlFor="q-title" error={errors.title}><Input id="q-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      </div>
      <Field label="Description" htmlFor="q-desc"><Textarea id="q-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Time limit (min)" htmlFor="q-time" hint="Blank = untimed"><Input id="q-time" type="number" min={1} value={form.timeLimitMinutes ?? ""} onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Attempts allowed" htmlFor="q-att"><Input id="q-att" type="number" min={1} max={20} value={form.attemptLimit} onChange={(e) => setForm({ ...form, attemptLimit: Number(e.target.value) })} /></Field>
        <Field label="Passing score %" htmlFor="q-pass"><Input id="q-pass" type="number" min={0} max={100} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} /></Field>
        <Field label="Negative marking (fraction)" htmlFor="q-neg"><Input id="q-neg" type="number" min={0} max={1} step={0.05} value={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })} /></Field>
        <Field label="Questions per attempt" htmlFor="q-per" hint="Blank = all questions"><Input id="q-per" type="number" min={1} value={form.questionsPerAttempt ?? ""} onChange={(e) => setForm({ ...form, questionsPerAttempt: e.target.value ? Number(e.target.value) : null })} /></Field>
        <div className="grid gap-4"><Field label="Available from" htmlFor="q-from"><Input id="q-from" type="datetime-local" value={form.availableFrom} onChange={(e) => setForm({ ...form, availableFrom: e.target.value })} /></Field></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {([["shuffleQuestions", "Shuffle questions"], ["shuffleOptions", "Shuffle options"], ["showAnswersAfter", "Show answers after submission"], ["isPublished", "Published"]] as const).map(([k, l]) => (
          <div key={k} className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor={`q-${k}`}>{l}</Label><Switch id={`q-${k}`} checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} /></div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        {id ? <Button variant="ghost" onClick={() => window.confirm("Delete this quiz and all attempts?") && start(async () => { const res = await deleteQuizAction(id); if (!res.ok) { toast.error(res.error.message); return; } router.push("/instructor/quizzes"); })}><Trash2 /> Delete</Button> : <span />}
        <Button onClick={save} loading={pending}>{id ? "Save settings" : "Create quiz"}</Button>
      </div>
    </div>
  );
}

export function QuestionBank({ quizId, examId, questions }: { quizId?: string; examId?: string; questions: EditorQuestion[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Partial<EditorQuestion> | null>(null);
  const [pending, start] = React.useTransition();
  const empty = (): Partial<EditorQuestion> => ({ type: "MULTIPLE_CHOICE", prompt: "", explanation: "", topic: "", difficulty: "MEDIUM", points: 1, options: [{ id: "", text: "", isCorrect: true, matchKey: null }, { id: "", text: "", isCorrect: false, matchKey: null }, { id: "", text: "", isCorrect: false, matchKey: null }, { id: "", text: "", isCorrect: false, matchKey: null }] });

  const save = () => {
    if (!editing) return;
    const q = editing;
    let answerKey: unknown = undefined;
    if (q.type === "SHORT_ANSWER" || q.type === "FILL_BLANK") answerKey = { accepted: ((q.answerKey as { accepted?: string[] })?.accepted ?? []).filter(Boolean) };
    if (q.type === "TRUE_FALSE" && (!q.options || q.options.length !== 2)) q.options = [{ id: "", text: "True", isCorrect: true, matchKey: null }, { id: "", text: "False", isCorrect: false, matchKey: null }];
    start(async () => {
      const res = await saveQuestionAction({ quizId, examId, questionId: q.id, input: { type: q.type as never, prompt: q.prompt ?? "", explanation: q.explanation ?? "", topic: q.topic ?? "", difficulty: (q.difficulty as never) ?? "MEDIUM", points: q.points ?? 1, codeLanguage: q.codeLanguage ?? "", codeStarter: q.codeStarter ?? "", options: (q.options ?? []).filter((o) => o.text.trim()).map((o) => ({ text: o.text, isCorrect: o.isCorrect, matchKey: o.matchKey })), answerKey } });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Question saved.");
      setEditing(null);
      router.refresh();
    });
  };

  const objective = ["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "IMAGE"].includes(editing?.type ?? "");
  const total = questions.reduce((s, q) => s + q.points, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">{questions.length} questions · {total} points</p>
        <Button size="sm" onClick={() => setEditing(empty())}><Plus /> Add question</Button>
      </div>
      {questions.length ? (
        <ol className="flex flex-col gap-2">
          {questions.map((q, i) => (
            <li key={q.id} className="surface flex items-start gap-3 p-4">
              <span className="w-6 pt-0.5 text-caption text-fg-subtle">{i + 1}.</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{q.prompt}</p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-caption">
                  <Badge>{enumLabel(q.type)}</Badge>
                  <Badge variant={q.difficulty === "HARD" ? "danger" : q.difficulty === "EASY" ? "success" : "warning"}>{enumLabel(q.difficulty)}</Badge>
                  {q.topic ? <Badge variant="accent">{q.topic}</Badge> : null}
                  <span className="text-fg-subtle">{q.points} pt{q.points === 1 ? "" : "s"}</span>
                </div>
                {q.options.length ? <ul className="mt-2 flex flex-col gap-0.5 text-caption text-fg-muted">{q.options.map((o) => <li key={o.id} className={cn(o.isCorrect && "text-success")}>{o.isCorrect ? "✓ " : "· "}{o.text}{o.matchKey ? ` → ${o.matchKey}` : ""}</li>)}</ul> : null}
              </div>
              <IconButton label="Edit" size="sm" onClick={() => setEditing(q)}><Pencil /></IconButton>
              <IconButton label="Delete" size="sm" onClick={() => window.confirm("Delete this question?") && start(async () => { const res = await deleteQuestionAction(q.id); if (!res.ok) { toast.error(res.error.message); return; } router.refresh(); })}><Trash2 /></IconButton>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-body-sm text-fg-muted">No questions yet. Add the first one.</div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_140px_100px]">
                <Field label="Type" htmlFor="qq-type"><SimpleSelect value={editing.type ?? "MULTIPLE_CHOICE"} onValueChange={(v) => setEditing({ ...editing, type: v, options: v === "TRUE_FALSE" ? [{ id: "", text: "True", isCorrect: true, matchKey: null }, { id: "", text: "False", isCorrect: false, matchKey: null }] : editing.options })} options={TYPES.map(([v, l]) => ({ value: v, label: l }))} /></Field>
                <Field label="Difficulty" htmlFor="qq-diff"><SimpleSelect value={editing.difficulty ?? "MEDIUM"} onValueChange={(v) => setEditing({ ...editing, difficulty: v })} options={[{ value: "EASY", label: "Easy" }, { value: "MEDIUM", label: "Medium" }, { value: "HARD", label: "Hard" }]} /></Field>
                <Field label="Points" htmlFor="qq-pts"><Input id="qq-pts" type="number" min={0} step={0.5} value={editing.points ?? 1} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Question" htmlFor="qq-prompt"><Textarea id="qq-prompt" rows={3} value={editing.prompt ?? ""} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} /></Field>
              <Field label="Topic" htmlFor="qq-topic" hint="Used for weak-topic analysis and recommendations"><Input id="qq-topic" value={editing.topic ?? ""} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} placeholder="e.g. Audience targeting" /></Field>
              {objective || editing.type === "MATCHING" || editing.type === "ORDERING" ? (
                <div className="flex flex-col gap-2">
                  <Label>{editing.type === "MATCHING" ? "Pairs (left → right)" : editing.type === "ORDERING" ? "Items in the correct order" : "Options (tick the correct ones)"}</Label>
                  {(editing.options ?? []).map((o, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {objective ? <Checkbox checked={o.isCorrect} onCheckedChange={(v) => setEditing({ ...editing, options: (editing.options ?? []).map((x, j) => (editing.type === "MULTIPLE_SELECT" ? (j === i ? { ...x, isCorrect: !!v } : x) : { ...x, isCorrect: j === i ? !!v : false })) })} aria-label="Correct" /> : <span className="w-5 text-caption text-fg-subtle">{i + 1}</span>}
                      <Input value={o.text} onChange={(e) => setEditing({ ...editing, options: (editing.options ?? []).map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} placeholder={editing.type === "MATCHING" ? "Left item" : `Option ${i + 1}`} disabled={editing.type === "TRUE_FALSE"} />
                      {editing.type === "MATCHING" ? <Input value={o.matchKey ?? ""} onChange={(e) => setEditing({ ...editing, options: (editing.options ?? []).map((x, j) => (j === i ? { ...x, matchKey: e.target.value } : x)) })} placeholder="Matches" /> : null}
                      {editing.type !== "TRUE_FALSE" ? <IconButton label="Remove" size="sm" onClick={() => setEditing({ ...editing, options: (editing.options ?? []).filter((_, j) => j !== i) })}><Trash2 /></IconButton> : null}
                    </div>
                  ))}
                  {editing.type !== "TRUE_FALSE" && (editing.options?.length ?? 0) < 12 ? <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setEditing({ ...editing, options: [...(editing.options ?? []), { id: "", text: "", isCorrect: false, matchKey: null }] })}><Plus /> Add option</Button> : null}
                </div>
              ) : null}
              {editing.type === "SHORT_ANSWER" || editing.type === "FILL_BLANK" ? (
                <Field label="Accepted answers (one per line, case-insensitive)" htmlFor="qq-acc"><Textarea id="qq-acc" rows={3} value={(((editing.answerKey as { accepted?: string[] })?.accepted) ?? []).join("\n")} onChange={(e) => setEditing({ ...editing, answerKey: { accepted: e.target.value.split("\n").map((s) => s.trim()) } })} /></Field>
              ) : null}
              {editing.type === "CODE" ? (
                <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                  <Field label="Language" htmlFor="qq-lang"><Input id="qq-lang" value={editing.codeLanguage ?? ""} onChange={(e) => setEditing({ ...editing, codeLanguage: e.target.value })} placeholder="javascript" /></Field>
                  <Field label="Starter code" htmlFor="qq-code"><Textarea id="qq-code" rows={5} className="font-mono text-[13px]" value={editing.codeStarter ?? ""} onChange={(e) => setEditing({ ...editing, codeStarter: e.target.value })} /></Field>
                </div>
              ) : null}
              <Field label="Explanation (shown after grading)" htmlFor="qq-exp"><Textarea id="qq-exp" rows={2} value={editing.explanation ?? ""} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={save} disabled={!editing?.prompt?.trim()}><Check /> Save question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
