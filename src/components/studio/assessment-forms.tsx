"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveAssignmentAction, deleteAssignmentAction, saveProjectAction, deleteProjectAction, saveExamAction, deleteExamAction, saveRubricAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

type CourseOpt = { id: string; title: string };
type RubricOpt = { id: string; title: string };

const toLocalInput = (d: string | Date | null | undefined) => (d ? new Date(d).toISOString().slice(0, 16) : "");

function CourseSelect({ value, onChange, courses, disabled }: { value: string; onChange: (v: string) => void; courses: CourseOpt[]; disabled?: boolean }) {
  return <SimpleSelect value={value} onValueChange={onChange} options={courses.map((c) => ({ value: c.id, label: c.title }))} placeholder="Choose a course" disabled={disabled} />;
}

function RubricPicker({ value, onChange, rubrics, onCreated }: { value: string | null; onChange: (v: string | null) => void; rubrics: RubricOpt[]; onCreated: (r: RubricOpt) => void }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [criteria, setCriteria] = React.useState([{ title: "", description: "", maxPoints: 10 }]);
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between"><Label>Rubric (optional)</Label><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}><Plus /> New rubric</Button></div>
      <Combobox options={rubrics.map((r) => ({ value: r.id, label: r.title }))} value={value} onChange={onChange} placeholder="No rubric — grade with a single score" />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>New rubric</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Field label="Title" htmlFor="rb-title"><Input id="rb-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            {criteria.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
                <Input value={c.title} onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Criterion" />
                <Input value={c.description} onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="What good looks like" />
                <Input type="number" min={0} value={c.maxPoints} onChange={(e) => setCriteria(criteria.map((x, j) => (j === i ? { ...x, maxPoints: Number(e.target.value) } : x)))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} disabled={criteria.length === 1} aria-label="Remove"><Trash2 /></Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setCriteria([...criteria, { title: "", description: "", maxPoints: 10 }])}><Plus /> Add criterion</Button>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} disabled={!title.trim() || criteria.some((c) => !c.title.trim())} onClick={() => start(async () => { const res = await saveRubricAction({ title, criteria }); if (!res.ok) { toast.error(res.error.message); return; } onCreated({ id: res.data.id, title }); onChange(res.data.id); setOpen(false); toast.success("Rubric created."); })}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ───────────── Assignment ─────────────

export interface AssignmentFormValues { courseId: string; title: string; instructions: string; allowedKinds: string[]; maxPoints: number; dueAt: string; allowLate: boolean; latePenaltyPercent: number; rubricId: string | null; isPublished: boolean }

export function AssignmentForm({ id, initial, courses, rubrics: initialRubrics }: { id?: string; initial: AssignmentFormValues; courses: CourseOpt[]; rubrics: RubricOpt[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [rubrics, setRubrics] = React.useState(initialRubrics);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const kinds = [["TEXT", "Text"], ["FILE", "Files"], ["URL", "Link"], ["GITHUB", "GitHub"], ["WEBSITE", "Live site"]] as const;
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveAssignmentAction({ ...form, allowedKinds: form.allowedKinds as never, dueAt: form.dueAt ? new Date(form.dueAt) : null }, id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Assignment saved.");
      if (!id) router.push(`/instructor/assignments/${res.data.id}`);
      else router.refresh();
    });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="a-course" error={errors.courseId}><CourseSelect value={form.courseId} onChange={(v) => setForm({ ...form, courseId: v })} courses={courses} disabled={!!id} /></Field>
        <Field label="Title" htmlFor="a-title" error={errors.title}><Input id="a-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      </div>
      <div className="flex flex-col gap-2"><Label>Instructions</Label><RichTextEditor value={form.instructions} onChange={(v) => setForm({ ...form, instructions: v })} minHeight={220} /></div>
      <div className="flex flex-col gap-2">
        <Label>Accepted submission types</Label>
        <div className="flex flex-wrap gap-4">{kinds.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm"><Checkbox checked={form.allowedKinds.includes(k)} onCheckedChange={(v) => setForm({ ...form, allowedKinds: v ? [...form.allowedKinds, k] : form.allowedKinds.filter((x) => x !== k) })} /> {l}</label>)}</div>
        {errors.allowedKinds ? <p className="text-body-sm text-danger">{errors.allowedKinds[0]}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Max points" htmlFor="a-pts" error={errors.maxPoints}><Input id="a-pts" type="number" min={1} value={form.maxPoints} onChange={(e) => setForm({ ...form, maxPoints: Number(e.target.value) })} /></Field>
        <Field label="Due" htmlFor="a-due"><Input id="a-due" type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} /></Field>
        <Field label="Late penalty %" htmlFor="a-pen"><Input id="a-pen" type="number" min={0} max={100} value={form.latePenaltyPercent} onChange={(e) => setForm({ ...form, latePenaltyPercent: Number(e.target.value) })} disabled={!form.allowLate} /></Field>
      </div>
      <RubricPicker value={form.rubricId} onChange={(v) => setForm({ ...form, rubricId: v })} rubrics={rubrics} onCreated={(r) => setRubrics([...rubrics, r])} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="a-late">Allow late submissions</Label><Switch id="a-late" checked={form.allowLate} onCheckedChange={(v) => setForm({ ...form, allowLate: v })} /></div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="a-pub">Published (visible to students)</Label><Switch id="a-pub" checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        {id ? <Button variant="ghost" onClick={() => window.confirm("Delete this assignment and all submissions?") && start(async () => { const res = await deleteAssignmentAction(id); if (!res.ok) { toast.error(res.error.message); return; } router.push("/instructor/assignments"); })}><Trash2 /> Delete</Button> : <span />}
        <Button onClick={save} loading={pending}>{id ? "Save" : "Create assignment"}</Button>
      </div>
    </div>
  );
}

// ───────────── Project ─────────────

export interface ProjectFormValues { courseId: string; title: string; overview: string; requirements: string; skills: string[]; resources: Array<{ title: string; url: string }>; deadline: string; maxPoints: number; rubricId: string | null; addToPortfolio: boolean; isPublished: boolean; milestones: Array<{ id?: string; title: string; description: string; dueAt: string }> }

export function ProjectForm({ id, initial, courses, rubrics: initialRubrics }: { id?: string; initial: ProjectFormValues; courses: CourseOpt[]; rubrics: RubricOpt[] }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [rubrics, setRubrics] = React.useState(initialRubrics);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveProjectAction({ ...form, deadline: form.deadline ? new Date(form.deadline) : null, resources: form.resources.filter((r) => r.title && r.url), milestones: form.milestones.map((m) => ({ ...m, dueAt: m.dueAt ? new Date(m.dueAt) : null })) }, id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Project saved.");
      if (!id) router.push(`/instructor/projects/${res.data.id}`);
      else router.refresh();
    });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="p-course" error={errors.courseId}><CourseSelect value={form.courseId} onChange={(v) => setForm({ ...form, courseId: v })} courses={courses} disabled={!!id} /></Field>
        <Field label="Title" htmlFor="p-title" error={errors.title}><Input id="p-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      </div>
      <Field label="Overview" htmlFor="p-over" error={errors.overview}><Textarea id="p-over" rows={3} value={form.overview} onChange={(e) => setForm({ ...form, overview: e.target.value })} placeholder="One paragraph a student reads first." /></Field>
      <div className="flex flex-col gap-2"><Label>Requirements</Label><RichTextEditor value={form.requirements} onChange={(v) => setForm({ ...form, requirements: v })} minHeight={220} /></div>
      <Field label="Skills (comma separated)" htmlFor="p-skills"><Input id="p-skills" value={form.skills.join(", ")} onChange={(e) => setForm({ ...form, skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
      <div className="flex flex-col gap-2">
        <Label>Milestones</Label>
        {form.milestones.map((m, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_180px_auto]">
            <Input value={m.title} onChange={(e) => setForm({ ...form, milestones: form.milestones.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Milestone" />
            <Input value={m.description} onChange={(e) => setForm({ ...form, milestones: form.milestones.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} placeholder="Description" />
            <Input type="datetime-local" value={m.dueAt} onChange={(e) => setForm({ ...form, milestones: form.milestones.map((x, j) => (j === i ? { ...x, dueAt: e.target.value } : x)) })} />
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, milestones: form.milestones.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 /></Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, milestones: [...form.milestones, { title: "", description: "", dueAt: "" }] })}><Plus /> Add milestone</Button>
      </div>
      <div className="flex flex-col gap-2">
        <Label>Resources</Label>
        {form.resources.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={r.title} onChange={(e) => setForm({ ...form, resources: form.resources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} placeholder="Title" />
            <Input type="url" value={r.url} onChange={(e) => setForm({ ...form, resources: form.resources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })} placeholder="https://" />
            <Button type="button" variant="ghost" size="icon" onClick={() => setForm({ ...form, resources: form.resources.filter((_, j) => j !== i) })} aria-label="Remove"><Trash2 /></Button>
          </div>
        ))}
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => setForm({ ...form, resources: [...form.resources, { title: "", url: "" }] })}><Plus /> Add resource</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Deadline" htmlFor="p-dl"><Input id="p-dl" type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
        <Field label="Max points" htmlFor="p-pts"><Input id="p-pts" type="number" min={1} value={form.maxPoints} onChange={(e) => setForm({ ...form, maxPoints: Number(e.target.value) })} /></Field>
      </div>
      <RubricPicker value={form.rubricId} onChange={(v) => setForm({ ...form, rubricId: v })} rubrics={rubrics} onCreated={(r) => setRubrics([...rubrics, r])} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="p-pf">Add approved work to student portfolios</Label><Switch id="p-pf" checked={form.addToPortfolio} onCheckedChange={(v) => setForm({ ...form, addToPortfolio: v })} /></div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="p-pub">Published</Label><Switch id="p-pub" checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        {id ? <Button variant="ghost" onClick={() => window.confirm("Delete this project and all submissions?") && start(async () => { const res = await deleteProjectAction(id); if (!res.ok) { toast.error(res.error.message); return; } router.push("/instructor/projects"); })}><Trash2 /> Delete</Button> : <span />}
        <Button onClick={save} loading={pending}>{id ? "Save" : "Create project"}</Button>
      </div>
    </div>
  );
}

// ───────────── Exam ─────────────

export interface ExamFormValues { courseId: string; batchId: string | null; title: string; kind: "MIDTERM" | "FINAL" | "PRACTICAL" | "MOCK"; description: string; scheduledAt: string; durationMinutes: number; passingScore: number; attemptLimit: number; negativeMarking: number; shuffleQuestions: boolean; isPublished: boolean }

export function ExamForm({ id, initial, courses, batches }: { id?: string; initial: ExamFormValues; courses: CourseOpt[]; batches: Array<{ id: string; name: string; courseId: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await saveExamAction({ ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : null }, id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Exam saved.");
      if (!id) router.push(`/instructor/exams/${res.data.id}`);
      else router.refresh();
    });
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="e-course" error={errors.courseId}><CourseSelect value={form.courseId} onChange={(v) => setForm({ ...form, courseId: v, batchId: null })} courses={courses} disabled={!!id} /></Field>
        <Field label="Batch (optional)" htmlFor="e-batch"><Combobox options={batches.filter((b) => b.courseId === form.courseId).map((b) => ({ value: b.id, label: b.name }))} value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v })} placeholder="All batches" /></Field>
        <Field label="Title" htmlFor="e-title" error={errors.title}><Input id="e-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Kind" htmlFor="e-kind"><SimpleSelect value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as ExamFormValues["kind"] })} options={[{ value: "MIDTERM", label: "Midterm" }, { value: "FINAL", label: "Final" }, { value: "PRACTICAL", label: "Practical" }, { value: "MOCK", label: "Mock" }]} /></Field>
      </div>
      <Field label="Description" htmlFor="e-desc"><Textarea id="e-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Scheduled at" htmlFor="e-when"><Input id="e-when" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
        <Field label="Duration (minutes)" htmlFor="e-dur"><Input id="e-dur" type="number" min={5} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></Field>
        <Field label="Passing score %" htmlFor="e-pass"><Input id="e-pass" type="number" min={0} max={100} value={form.passingScore} onChange={(e) => setForm({ ...form, passingScore: Number(e.target.value) })} /></Field>
        <Field label="Attempt limit" htmlFor="e-att"><Input id="e-att" type="number" min={1} max={5} value={form.attemptLimit} onChange={(e) => setForm({ ...form, attemptLimit: Number(e.target.value) })} /></Field>
        <Field label="Negative marking (fraction)" htmlFor="e-neg" hint="0.25 = lose a quarter point per wrong answer"><Input id="e-neg" type="number" min={0} max={1} step={0.05} value={form.negativeMarking} onChange={(e) => setForm({ ...form, negativeMarking: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="e-shuf">Shuffle questions</Label><Switch id="e-shuf" checked={form.shuffleQuestions} onCheckedChange={(v) => setForm({ ...form, shuffleQuestions: v })} /></div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="e-pub">Published (students are notified)</Label><Switch id="e-pub" checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} /></div>
      </div>
      <div className="flex items-center justify-between border-t border-border pt-4">
        {id ? <Button variant="ghost" onClick={() => window.confirm("Delete this exam and all attempts?") && start(async () => { const res = await deleteExamAction(id); if (!res.ok) { toast.error(res.error.message); return; } router.push("/instructor/exams"); })}><Trash2 /> Delete</Button> : <span />}
        <Button onClick={save} loading={pending}>{id ? "Save" : "Create exam"}</Button>
      </div>
    </div>
  );
}

export { toLocalInput };
