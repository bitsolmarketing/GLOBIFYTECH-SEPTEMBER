"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles, Check, X, Rocket, Plus, Trash2, Clock } from "lucide-react";
import { generateCourseAction, reviewGenerationAction, applyGenerationAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { enumLabel, relativeTime } from "@/lib/utils";

export interface GenerationRow {
  id: string;
  status: string;
  createdAt: string;
  requestedBy: string;
  approvedBy: string | null;
  courseId: string | null;
  courseTitle: string | null;
  input: { courseName: string; audience: string; difficulty: string; durationWeeks: number; learningGoals: string[] };
  output: { title: string; subtitle: string; outcomes: string[]; skills: string[]; modules: Array<{ title: string; description: string; lessons: Array<{ title: string; type: string; durationMinutes: number }>; quiz?: { title: string; questions: unknown[] }; assignment?: { title: string } }>; project: { title: string; overview: string } };
}

export function AiCourseBuilder({ enabled, canApprove, generations, categories }: { enabled: boolean; canApprove: boolean; generations: GenerationRow[]; categories: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ courseName: "", audience: "", difficulty: "BEGINNER", durationWeeks: 8, hoursPerWeek: 6, learningGoals: [""], notes: "" });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const [applying, setApplying] = React.useState<string | null>(null);
  const [categoryId, setCategoryId] = React.useState<string | null>(null);

  const generate = () =>
    start(async () => {
      setErrors({});
      const res = await generateCourseAction({ ...form, difficulty: form.difficulty as "BEGINNER", learningGoals: form.learningGoals.filter(Boolean), courseId: null });
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        toast.error(res.error.message);
        return;
      }
      toast.success("Draft generated. Review it below — nothing is published until a human approves it.");
      router.refresh();
    });

  const review = (id: string, decision: "APPROVED" | "REJECTED") =>
    start(async () => {
      const res = await reviewGenerationAction(id, decision);
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(decision === "APPROVED" ? "Draft approved. You can now apply it." : "Draft rejected.");
      router.refresh();
    });

  const apply = (id: string) =>
    start(async () => {
      const res = await applyGenerationAction(id, { categoryId });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Draft applied as an unpublished course.");
      setApplying(null);
      router.push(`/instructor/course/${res.data.courseId}`);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="surface flex flex-col gap-4 p-6 lg:col-span-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-accent" />
          <h2 className="text-h4">Generate a course draft</h2>
        </div>
        {!enabled ? <Alert variant="warning" title="AI provider not configured">Add an API key in the environment to enable the course builder. Manual authoring works without it.</Alert> : null}
        <Field label="Course name" htmlFor="ai-name" error={errors.courseName}><Input id="ai-name" value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} placeholder="AI-Powered Social Media Marketing" /></Field>
        <Field label="Audience" htmlFor="ai-aud" error={errors.audience}><Input id="ai-aud" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} placeholder="Beginners with a smartphone who want freelance clients" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Level" htmlFor="ai-level"><SimpleSelect value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} /></Field>
          <Field label="Weeks" htmlFor="ai-weeks" error={errors.durationWeeks}><Input id="ai-weeks" type="number" min={1} max={52} value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: Number(e.target.value) })} /></Field>
          <Field label="Hrs/week" htmlFor="ai-hpw"><Input id="ai-hpw" type="number" min={1} max={40} value={form.hoursPerWeek} onChange={(e) => setForm({ ...form, hoursPerWeek: Number(e.target.value) })} /></Field>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Learning goals</p>
          {form.learningGoals.map((g, i) => (
            <div key={i} className="flex gap-2">
              <Input value={g} onChange={(e) => setForm({ ...form, learningGoals: form.learningGoals.map((x, j) => (j === i ? e.target.value : x)) })} placeholder="Run a profitable ad campaign end to end" />
              <Button variant="ghost" size="icon" onClick={() => setForm({ ...form, learningGoals: form.learningGoals.filter((_, j) => j !== i) })} disabled={form.learningGoals.length === 1} aria-label="Remove"><Trash2 /></Button>
            </div>
          ))}
          {errors.learningGoals ? <p className="text-body-sm text-danger">{errors.learningGoals[0]}</p> : null}
          {form.learningGoals.length < 10 ? <Button variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, learningGoals: [...form.learningGoals, ""] })}><Plus /> Add goal</Button> : null}
        </div>
        <Field label="Notes for the AI (optional)" htmlFor="ai-notes"><Textarea id="ai-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Tools to cover, things to avoid, tone…" /></Field>
        <Button onClick={generate} loading={pending} disabled={!enabled || !form.courseName || !form.audience}><Sparkles /> Generate draft</Button>
        <p className="text-caption text-fg-subtle">Drafts are reviewed by an academic manager before they can be applied to the catalogue, and applied content stays unpublished until you publish it.</p>
      </section>

      <section className="flex flex-col gap-4 lg:col-span-7">
        <h2 className="text-h4">Drafts</h2>
        {generations.length ? (
          <Accordion type="single" collapsible className="surface divide-y divide-border px-5">
            {generations.map((g) => (
              <AccordionItem key={g.id} value={g.id}>
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 items-center gap-3 pe-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{g.output.title}</span>
                      <span className="block text-caption font-normal text-fg-muted">{g.input.durationWeeks} weeks · {g.output.modules.length} modules · by {g.requestedBy} · {relativeTime(g.createdAt)}</span>
                    </span>
                    <Badge variant={statusVariant(g.status)}>{enumLabel(g.status)}</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4">
                  <p className="text-body-sm">{g.output.subtitle}</p>
                  <div className="flex flex-wrap gap-1.5">{g.output.skills.map((s) => <Badge key={s} variant="accent">{s}</Badge>)}</div>
                  <ol className="flex flex-col gap-2">
                    {g.output.modules.map((m, i) => (
                      <li key={i} className="rounded-lg border border-border p-3">
                        <p className="text-sm font-medium">{i + 1}. {m.title}</p>
                        <p className="text-caption text-fg-muted">{m.lessons.length} lessons{m.quiz ? ` · quiz (${m.quiz.questions.length} q)` : ""}{m.assignment ? " · assignment" : ""} · <Clock className="inline size-3" /> {m.lessons.reduce((s, l) => s + l.durationMinutes, 0)} min</p>
                        <ul className="mt-1 list-disc ps-5 text-caption text-fg-muted">{m.lessons.map((l, j) => <li key={j}>{l.title}</li>)}</ul>
                      </li>
                    ))}
                  </ol>
                  <div className="rounded-lg bg-bg-subtle p-3 text-sm"><p className="font-medium">Capstone: {g.output.project.title}</p><p className="text-caption text-fg-muted">{g.output.project.overview}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    {g.status === "DRAFT" && canApprove ? (
                      <>
                        <Button size="sm" onClick={() => review(g.id, "APPROVED")} loading={pending}><Check /> Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => review(g.id, "REJECTED")} loading={pending}><X /> Reject</Button>
                      </>
                    ) : null}
                    {g.status === "DRAFT" && !canApprove ? <span className="text-caption text-fg-muted">Waiting for an academic manager to approve.</span> : null}
                    {g.status === "APPROVED" && canApprove ? (
                      applying === g.id ? (
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="flex-1"><Field label="Category for the new course" htmlFor="ai-cat"><Combobox options={categories.map((c) => ({ value: c.id, label: c.name }))} value={categoryId} onChange={setCategoryId} placeholder="Choose a category" /></Field></div>
                          <Button size="sm" onClick={() => apply(g.id)} loading={pending}><Rocket /> Create draft course</Button>
                          <Button size="sm" variant="ghost" onClick={() => setApplying(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => setApplying(g.id)}><Rocket /> Apply to catalogue</Button>
                      )
                    ) : null}
                    {g.status === "APPLIED" && g.courseId ? <Button asChild size="sm" variant="secondary"><Link href={`/instructor/course/${g.courseId}`}>Open course</Link></Button> : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="text-body-sm text-fg-muted">No drafts yet. Generate one on the left, or create a course manually below.</p>
        )}
      </section>
    </div>
  );
}
