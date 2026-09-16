"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal } from "lucide-react";
import { createEnrollmentAction, setEnrollmentStatusAction, searchStudentsAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { enumLabel, formatMoney } from "@/lib/utils";

type Student = { id: string; label: string };

export function EnrollmentForm({ courses, batches, feePlans, preselected, openInitially }: { courses: Array<{ id: string; title: string }>; batches: Array<{ id: string; code: string; courseId: string }>; feePlans: Array<{ id: string; name: string; courseId: string; totalAmount: number; currency: string }>; preselected: Student | null; openInitially?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!!openInitially);
  const [student, setStudent] = React.useState<Student | null>(preselected);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Student[]>([]);
  const [form, setForm] = React.useState({ courseId: courses[0]?.id ?? "", batchId: "", source: "MANUAL" as "MANUAL" | "ADMISSION" | "DIRECT" | "SCHOLARSHIP", createInvoice: false, feePlanId: "" });
  const [pending, start] = React.useTransition();
  const [searching, startSearch] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const courseBatches = batches.filter((b) => b.courseId === form.courseId);
  const coursePlans = feePlans.filter((p) => p.courseId === form.courseId);
  const search = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => startSearch(async () => { const res = await searchStudentsAction(value); if (res.ok) setResults(res.data); }), 300);
  };
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Plus /> Enroll student</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enroll a student</DialogTitle><DialogDescription>Grants course access immediately. Optionally raise the invoice from a fee plan.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="en-student">Student</Label>
              {student ? (
                <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{student.label}</span><Button variant="ghost" size="sm" onClick={() => { setStudent(null); setResults([]); }}>Change</Button></div>
              ) : (
                <>
                  <Input id="en-student" value={q} onChange={(e) => search(e.target.value)} placeholder="Search by name, email, phone or number" autoFocus />
                  {q.length >= 2 ? <ul className="max-h-48 overflow-y-auto rounded-md border border-border">{results.map((r) => <li key={r.id}><button type="button" className="w-full px-3 py-2 text-start text-sm hover:bg-bg-subtle" onClick={() => setStudent(r)}>{r.label}</button></li>)}{!results.length && !searching ? <li className="px-3 py-2 text-caption text-fg-muted">No students found.</li> : null}</ul> : null}
                </>
              )}
            </div>
            <Field label="Course" htmlFor="en-course"><Combobox options={courses.map((c) => ({ value: c.id, label: c.title }))} value={form.courseId} onChange={(v) => setForm({ ...form, courseId: v ?? "", batchId: "", feePlanId: "" })} placeholder="Select course" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Batch" htmlFor="en-batch"><SimpleSelect value={form.batchId || "none"} onValueChange={(v) => setForm({ ...form, batchId: v === "none" ? "" : v })} options={[{ value: "none", label: "No batch (self-paced)" }, ...courseBatches.map((b) => ({ value: b.id, label: b.code }))]} /></Field>
              <Field label="Source" htmlFor="en-source"><SimpleSelect value={form.source} onValueChange={(v) => setForm({ ...form, source: v as typeof form.source })} options={["MANUAL", "ADMISSION", "DIRECT", "SCHOLARSHIP"].map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="en-invoice">Create invoice from a fee plan</Label><Switch id="en-invoice" checked={form.createInvoice} onCheckedChange={(v) => setForm({ ...form, createInvoice: v, feePlanId: v ? (coursePlans[0]?.id ?? "") : "" })} disabled={!coursePlans.length} /></div>
            {form.createInvoice ? <Field label="Fee plan" htmlFor="en-plan"><SimpleSelect value={form.feePlanId} onValueChange={(v) => setForm({ ...form, feePlanId: v })} options={coursePlans.map((p) => ({ value: p.id, label: `${p.name} · ${formatMoney(p.totalAmount, p.currency)}` }))} /></Field> : !coursePlans.length ? <p className="text-caption text-fg-subtle">This course has no fee plan yet. Add one from the course page to invoice automatically.</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} disabled={!student || !form.courseId} onClick={() => start(async () => { if (!student) return; const res = await createEnrollmentAction({ studentId: student.id, courseId: form.courseId, batchId: form.batchId || null, source: form.source, createInvoice: form.createInvoice, feePlanId: form.feePlanId || null }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Student enrolled."); setOpen(false); router.replace("/admin/enrollments"); router.refresh(); })}>Enroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EnrollmentStatusMenu({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const set = (s: "ACTIVE" | "PAUSED" | "DROPPED" | "EXPIRED") => start(async () => { const res = await setEnrollmentStatusAction(id, s); if (!res.ok) { toast.error(res.error.message); return; } toast.success(`Enrollment ${s.toLowerCase()}.`); router.refresh(); });
  if (status === "COMPLETED") return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label="Change status" loading={pending}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {status !== "ACTIVE" ? <DropdownMenuItem onSelect={() => set("ACTIVE")}>Reactivate</DropdownMenuItem> : null}
        {status === "ACTIVE" ? <DropdownMenuItem onSelect={() => set("PAUSED")}>Pause</DropdownMenuItem> : null}
        {status !== "DROPPED" ? <DropdownMenuItem onSelect={() => set("DROPPED")} className="text-danger">Mark dropped</DropdownMenuItem> : null}
        {status !== "EXPIRED" ? <DropdownMenuItem onSelect={() => set("EXPIRED")}>Expire access</DropdownMenuItem> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
