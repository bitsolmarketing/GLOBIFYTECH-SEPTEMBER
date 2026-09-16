"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Route, Layers, ExternalLink } from "lucide-react";
import { saveProgramAction, setProgramStatusAction, saveLearningPathAction, setLearningPathStatusAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { enumLabel, formatMoney } from "@/lib/utils";

type Status = "DRAFT" | "PUBLISHED" | "ARCHIVED";
interface Program { id: string; title: string; slug: string; subtitle: string; description: string; durationWeeks: number | null; price: number | null; featured: boolean; outcomes: string[]; status: string; courseIds: string[]; courseTitles: string[] }
interface Step { title: string; description: string; courseId: string | null; isOptional: boolean }
interface Path { id: string; title: string; slug: string; description: string; careerGoal: string; artworkKey: string; featured: boolean; status: string; steps: Step[] }

const EMPTY_PROGRAM = { title: "", subtitle: "", description: "", durationWeeks: null as number | null, price: null as number | null, featured: false, outcomes: [] as string[], courseIds: [] as string[] };
const EMPTY_PATH = { title: "", description: "", careerGoal: "", artworkKey: "ai", featured: false, steps: [] as Step[] };

export function ProgramManager({ tab, programs, paths, courses }: { tab: "programs" | "paths"; programs: Program[]; paths: Path[]; courses: Array<{ id: string; title: string }> }) {
  const router = useRouter();
  const [program, setProgram] = React.useState<(typeof EMPTY_PROGRAM & { id?: string }) | null>(null);
  const [path, setPath] = React.useState<(typeof EMPTY_PATH & { id?: string }) | null>(null);
  const [outcome, setOutcome] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const setStatus = (kind: "program" | "path", id: string, status: Status) => start(async () => { const res = kind === "program" ? await setProgramStatusAction(id, status) : await setLearningPathStatusAction(id, status); if (!res.ok) { toast.error(res.error.message); return; } toast.success(`Moved to ${enumLabel(status).toLowerCase()}.`); router.refresh(); });

  if (tab === "paths") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end"><Button size="sm" onClick={() => setPath({ ...EMPTY_PATH })}><Plus /> New learning path</Button></div>
        {paths.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {paths.map((p) => (
              <article key={p.id} className="surface flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-h4">{p.title}</p><p className="text-caption text-fg-muted">{p.careerGoal || "No career goal set"} · {p.steps.length} steps</p></div>
                  <div className="flex items-center gap-1"><Badge variant={statusVariant(p.status)}>{enumLabel(p.status)}</Badge>{p.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/learning-paths/${p.slug}`} target="_blank" aria-label="View"><ExternalLink /></Link></Button> : null}</div>
                </div>
                {p.description ? <p className="line-clamp-2 text-body-sm text-fg-muted">{p.description}</p> : null}
                <ol className="flex flex-col gap-1 text-caption text-fg-muted">{p.steps.slice(0, 5).map((s, i) => <li key={i}>{i + 1}. {s.title}{s.isOptional ? " (optional)" : ""}</li>)}</ol>
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPath({ id: p.id, title: p.title, description: p.description, careerGoal: p.careerGoal, artworkKey: p.artworkKey, featured: p.featured, steps: p.steps })}>Edit</Button>
                  {p.status !== "PUBLISHED" ? <Button variant="ghost" size="sm" loading={pending} onClick={() => setStatus("path", p.id, "PUBLISHED")}>Publish</Button> : <Button variant="ghost" size="sm" loading={pending} onClick={() => setStatus("path", p.id, "DRAFT")}>Unpublish</Button>}
                </div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={<Route />} title="No learning paths yet." description="A path guides a student from beginner to a career outcome across several courses." action={<Button size="sm" onClick={() => setPath({ ...EMPTY_PATH })}>Create a path</Button>} />}

        <Dialog open={!!path} onOpenChange={(o) => !o && setPath(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{path?.id ? "Edit learning path" : "New learning path"}</DialogTitle></DialogHeader>
            {path ? (
              <div className="grid gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Title" htmlFor="p-title" error={errors.title} required><Input id="p-title" value={path.title} onChange={(e) => setPath({ ...path, title: e.target.value })} /></Field>
                  <Field label="Career goal" htmlFor="p-goal"><Input id="p-goal" value={path.careerGoal} onChange={(e) => setPath({ ...path, careerGoal: e.target.value })} placeholder="Become a performance marketer" /></Field>
                </div>
                <Field label="Description" htmlFor="p-desc"><Textarea id="p-desc" rows={2} value={path.description} onChange={(e) => setPath({ ...path, description: e.target.value })} /></Field>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="p-feat">Feature on the home page</Label><Switch id="p-feat" checked={path.featured} onCheckedChange={(v) => setPath({ ...path, featured: v })} /></div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><p className="text-label">Steps</p><Button type="button" size="sm" variant="ghost" onClick={() => setPath({ ...path, steps: [...path.steps, { title: "", description: "", courseId: null, isOptional: false }] })}><Plus /> Add step</Button></div>
                  <div className="flex flex-col gap-2">
                    {path.steps.map((s, i) => (
                      <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
                        <div className="flex gap-2"><Input value={s.title} onChange={(e) => setPath({ ...path, steps: path.steps.map((x, ix) => (ix === i ? { ...x, title: e.target.value } : x)) })} placeholder={`Step ${i + 1} title`} /><Button type="button" size="sm" variant="ghost" aria-label="Remove step" onClick={() => setPath({ ...path, steps: path.steps.filter((_, ix) => ix !== i) })}><Trash2 /></Button></div>
                        <div className="flex gap-2"><SimpleSelect className="flex-1" value={s.courseId ?? "none"} onValueChange={(v) => setPath({ ...path, steps: path.steps.map((x, ix) => (ix === i ? { ...x, courseId: v === "none" ? null : v } : x)) })} options={[{ value: "none", label: "No course linked" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} /><label className="flex items-center gap-2 text-caption"><Checkbox checked={s.isOptional} onCheckedChange={(v) => setPath({ ...path, steps: path.steps.map((x, ix) => (ix === i ? { ...x, isOptional: !!v } : x)) })} />Optional</label></div>
                      </div>
                    ))}
                    {!path.steps.length ? <p className="text-caption text-fg-subtle">No steps yet.</p> : null}
                  </div>
                </div>
              </div>
            ) : null}
            <DialogFooter><Button variant="ghost" onClick={() => setPath(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!path) return; setErrors({}); const res = await saveLearningPathAction({ title: path.title, description: path.description, careerGoal: path.careerGoal, artworkKey: path.artworkKey, featured: path.featured, steps: path.steps.map((s) => ({ title: s.title, description: s.description, courseId: s.courseId, isOptional: s.isOptional })) }, path.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Learning path saved."); setPath(null); router.refresh(); })}>Save path</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setProgram({ ...EMPTY_PROGRAM })}><Plus /> New program</Button></div>
      {programs.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {programs.map((p) => (
            <article key={p.id} className="surface flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-h4">{p.title}</p><p className="text-caption text-fg-muted">{p.subtitle || `${p.courseIds.length} courses`}{p.durationWeeks ? ` · ${p.durationWeeks} weeks` : ""}{p.price ? ` · ${formatMoney(p.price)}` : ""}</p></div>
                <div className="flex items-center gap-1"><Badge variant={statusVariant(p.status)}>{enumLabel(p.status)}</Badge>{p.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/programs/${p.slug}`} target="_blank" aria-label="View"><ExternalLink /></Link></Button> : null}</div>
              </div>
              <ul className="flex flex-col gap-0.5 text-caption text-fg-muted">{p.courseTitles.map((t, i) => <li key={i}>{i + 1}. {t}</li>)}{!p.courseTitles.length ? <li>No courses added.</li> : null}</ul>
              {p.outcomes.length ? <div className="flex flex-wrap gap-1">{p.outcomes.slice(0, 4).map((o) => <Badge key={o}>{o}</Badge>)}</div> : null}
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => setProgram({ id: p.id, title: p.title, subtitle: p.subtitle, description: p.description, durationWeeks: p.durationWeeks, price: p.price, featured: p.featured, outcomes: p.outcomes, courseIds: p.courseIds })}>Edit</Button>
                {p.status !== "PUBLISHED" ? <Button variant="ghost" size="sm" loading={pending} onClick={() => setStatus("program", p.id, "PUBLISHED")}>Publish</Button> : <Button variant="ghost" size="sm" loading={pending} onClick={() => setStatus("program", p.id, "DRAFT")}>Unpublish</Button>}
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={<Layers />} title="No programs yet." description="A program bundles several courses into one enrollment and price." action={<Button size="sm" onClick={() => setProgram({ ...EMPTY_PROGRAM })}>Create a program</Button>} />}

      <Dialog open={!!program} onOpenChange={(o) => !o && setProgram(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{program?.id ? "Edit program" : "New program"}</DialogTitle></DialogHeader>
          {program ? (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title" htmlFor="pr-title" error={errors.title} required><Input id="pr-title" value={program.title} onChange={(e) => setProgram({ ...program, title: e.target.value })} /></Field>
                <Field label="Subtitle" htmlFor="pr-sub"><Input id="pr-sub" value={program.subtitle} onChange={(e) => setProgram({ ...program, subtitle: e.target.value })} /></Field>
                <Field label="Duration (weeks)" htmlFor="pr-weeks"><Input id="pr-weeks" type="number" min={1} value={program.durationWeeks ?? ""} onChange={(e) => setProgram({ ...program, durationWeeks: e.target.value ? Number(e.target.value) : null })} /></Field>
                <Field label="Price" htmlFor="pr-price"><Input id="pr-price" type="number" min={0} step="0.01" value={program.price ?? ""} onChange={(e) => setProgram({ ...program, price: e.target.value ? Number(e.target.value) : null })} /></Field>
              </div>
              <Field label="Description" htmlFor="pr-desc"><Textarea id="pr-desc" rows={3} value={program.description} onChange={(e) => setProgram({ ...program, description: e.target.value })} /></Field>
              <div className="flex flex-col gap-2">
                <Label>Outcomes</Label>
                <div className="flex flex-wrap gap-1">{program.outcomes.map((o) => <Badge key={o} variant="accent">{o}<button type="button" aria-label={`Remove ${o}`} onClick={() => setProgram({ ...program, outcomes: program.outcomes.filter((x) => x !== o) })}>×</button></Badge>)}</div>
                <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && outcome.trim()) { e.preventDefault(); setProgram({ ...program, outcomes: [...program.outcomes, outcome.trim()] }); setOutcome(""); } }} placeholder="Add an outcome and press Enter" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="pr-feat">Feature on the home page</Label><Switch id="pr-feat" checked={program.featured} onCheckedChange={(v) => setProgram({ ...program, featured: v })} /></div>
              <div>
                <Label className="mb-2 block">Courses in order</Label>
                <div className="max-h-48 overflow-y-auto rounded-md border border-border">
                  {courses.map((c) => {
                    const idx = program.courseIds.indexOf(c.id);
                    return (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-bg-subtle">
                        <Checkbox checked={idx >= 0} onCheckedChange={(v) => setProgram({ ...program, courseIds: v ? [...program.courseIds, c.id] : program.courseIds.filter((x) => x !== c.id) })} />
                        {idx >= 0 ? <span className="text-caption text-accent">{idx + 1}.</span> : null}
                        {c.title}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setProgram(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!program) return; setErrors({}); const res = await saveProgramAction({ title: program.title, subtitle: program.subtitle, description: program.description, durationWeeks: program.durationWeeks, price: program.price, featured: program.featured, outcomes: program.outcomes, courseIds: program.courseIds, artworkMediaId: null }, program.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Program saved."); setProgram(null); router.refresh(); })}>Save program</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
