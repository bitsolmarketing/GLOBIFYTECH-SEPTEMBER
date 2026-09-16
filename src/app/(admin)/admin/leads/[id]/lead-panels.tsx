"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Phone, MessageCircle, Mail, Users, StickyNote, Plus, Check, Pencil, Trash2, ChevronDown } from "lucide-react";
import { changeLeadStageAction, assignLeadAction, logLeadActivityAction, addLeadTaskAction, completeLeadTaskAction, addLeadNoteAction, deleteLeadAction } from "@/server/actions/admin";
import { LeadForm, type LeadFormValues } from "@/components/admin/lead-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel, formatDateTime, relativeTime } from "@/lib/utils";

const STAGES = ["NEW", "CONTACTED", "COUNSELLING", "INTERESTED", "APPLICATION", "APPROVED", "FEE_PENDING", "ENROLLED", "LOST"] as const;
type Stage = (typeof STAGES)[number];

export function LeadStagePicker({ leadId, stage }: { leadId: string; stage: Stage }) {
  const router = useRouter();
  const [lost, setLost] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, start] = React.useTransition();
  const move = (next: Stage, lostReason?: string) => start(async () => { const res = await changeLeadStageAction({ leadId, stage: next, lostReason }); if (!res.ok) { toast.error(res.error.message); return; } toast.success(`Moved to ${enumLabel(next)}.`); setLost(false); router.refresh(); });
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="sm" loading={pending}><Badge variant={statusVariant(stage)}>{enumLabel(stage)}</Badge><ChevronDown /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">{STAGES.filter((s) => s !== stage).map((s) => <DropdownMenuItem key={s} onSelect={() => (s === "LOST" ? setLost(true) : move(s))} className={s === "LOST" ? "text-danger" : undefined}>{enumLabel(s)}</DropdownMenuItem>)}</DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={lost} onOpenChange={setLost}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark as lost</DialogTitle><DialogDescription>Record the reason so the team can learn from it.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Chose another institute, budget, timing…" />
          <DialogFooter><Button variant="ghost" onClick={() => setLost(false)}>Cancel</Button><Button variant="danger" loading={pending} disabled={!reason.trim()} onClick={() => move("LOST", reason.trim())}>Mark lost</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function LeadAssign({ leadId, current, counsellors }: { leadId: string; current: string | null; counsellors: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <SimpleSelect size="sm" className="w-40" value={current ?? "none"} disabled={pending} onValueChange={(v) => start(async () => { const res = await assignLeadAction(leadId, v === "none" ? null : v); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Counsellor updated."); router.refresh(); })} options={[{ value: "none", label: "Unassigned" }, ...counsellors.map((c) => ({ value: c.id, label: c.name }))]} />
  );
}

const ACTIVITY_TYPES = [
  { key: "CALL", label: "Call", icon: Phone },
  { key: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { key: "EMAIL", label: "Email", icon: Mail },
  { key: "MEETING", label: "Meeting", icon: Users },
  { key: "NOTE", label: "Note", icon: StickyNote },
] as const;

export function LeadActivityComposer({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [type, setType] = React.useState<(typeof ACTIVITY_TYPES)[number]["key"]>("CALL");
  const [summary, setSummary] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [next, setNext] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <section className="surface p-5">
      <div className="mb-3 flex flex-wrap gap-1">{ACTIVITY_TYPES.map((t) => <button key={t.key} type="button" onClick={() => setType(t.key)} className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", type === t.key ? "bg-accent-soft text-accent" : "text-fg-muted hover:bg-bg-subtle")}><t.icon className="size-4" />{t.label}</button>)}</div>
      <div className="grid gap-3">
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder={type === "CALL" ? "Called, discussed evening batch timings" : "What happened?"} />
        <Textarea rows={2} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details (optional)" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid gap-1 text-caption text-fg-muted">Next follow-up<Input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} className="w-56" /></label>
          <Button loading={pending} disabled={!summary.trim()} onClick={() => start(async () => { const res = await logLeadActivityAction({ leadId, type, summary: summary.trim(), details: details.trim() || undefined, nextFollowUpAt: next ? new Date(next) : null }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Activity logged."); setSummary(""); setDetails(""); setNext(""); router.refresh(); })}>Log {ACTIVITY_TYPES.find((t) => t.key === type)?.label.toLowerCase()}</Button>
        </div>
      </div>
    </section>
  );
}

export function LeadTasks({ leadId, tasks, counsellors }: { leadId: string; tasks: Array<{ id: string; title: string; status: string; dueAt: string | null; assignee: string | null }>; counsellors: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [dueAt, setDueAt] = React.useState("");
  const [assigneeId, setAssigneeId] = React.useState("");
  const [pending, start] = React.useTransition();
  const open = tasks.filter((t) => t.status === "OPEN");
  return (
    <div className="surface p-5">
      <p className="text-label mb-2 text-fg-subtle">Tasks {open.length ? <Badge>{open.length} open</Badge> : null}</p>
      <ul className="mb-3 flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className={cn("flex items-start justify-between gap-2 text-sm", t.status !== "OPEN" && "text-fg-subtle line-through")}>
            <span>{t.title}<span className="block text-caption text-fg-subtle no-underline">{t.dueAt ? formatDateTime(new Date(t.dueAt)) : "No due date"}{t.assignee ? ` · ${t.assignee}` : ""}</span></span>
            {t.status === "OPEN" ? <Button size="sm" variant="ghost" aria-label="Complete" onClick={() => start(async () => { const res = await completeLeadTaskAction(t.id, leadId); if (!res.ok) { toast.error(res.error.message); return; } router.refresh(); })}><Check /></Button> : null}
          </li>
        ))}
        {!tasks.length ? <li className="text-caption text-fg-subtle">No tasks.</li> : null}
      </ul>
      <div className="grid gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" />
        <div className="flex gap-2"><Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="flex-1" aria-label="Due" /><SimpleSelect size="sm" className="w-32" value={assigneeId || "none"} onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)} options={[{ value: "none", label: "Anyone" }, ...counsellors.map((c) => ({ value: c.id, label: c.name }))]} /></div>
        <Button size="sm" variant="secondary" loading={pending} disabled={!title.trim()} onClick={() => start(async () => { const res = await addLeadTaskAction({ leadId, title: title.trim(), dueAt: dueAt ? new Date(dueAt) : null, assigneeId: assigneeId || null }); if (!res.ok) { toast.error(res.error.message); return; } setTitle(""); setDueAt(""); router.refresh(); })}><Plus /> Add task</Button>
      </div>
    </div>
  );
}

export function LeadNotes({ leadId, notes, canAdd }: { leadId: string; notes: Array<{ id: string; body: string; author: string; createdAt: string }>; canAdd: boolean }) {
  const router = useRouter();
  const [body, setBody] = React.useState("");
  const [pending, start] = React.useTransition();
  return (
    <section>
      <p className="text-h4 mb-3">Notes</p>
      {canAdd ? <div className="mb-3 flex gap-2"><Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Internal note (not visible to the lead)" /><Button loading={pending} disabled={!body.trim()} onClick={() => start(async () => { const res = await addLeadNoteAction({ leadId, body: body.trim() }); if (!res.ok) { toast.error(res.error.message); return; } setBody(""); router.refresh(); })}>Save</Button></div> : null}
      {notes.length ? <ul className="flex flex-col gap-2">{notes.map((n) => <li key={n.id} className="surface p-3 text-sm"><p className="whitespace-pre-wrap">{n.body}</p><p className="mt-1 text-caption text-fg-subtle">{n.author} · {relativeTime(new Date(n.createdAt))}</p></li>)}</ul> : <p className="text-caption text-fg-subtle">No notes yet.</p>}
    </section>
  );
}

export function LeadEditDialog({ id, initial, options }: { id: string; initial: Partial<LeadFormValues>; options: { courses: Array<{ id: string; title: string }>; counsellors: Array<{ id: string; name: string }>; campaigns: Array<{ id: string; name: string }> } }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Pencil /> Edit</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>Edit lead</DialogTitle></DialogHeader><LeadForm id={id} initial={initial} {...options} onSaved={() => setOpen(false)} /></DialogContent>
      </Dialog>
    </>
  );
}

export function LeadDeleteButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  return <ConfirmAction title="Delete this lead?" description="The lead is archived and hidden from the pipeline. Activity history is kept for audit." confirmLabel="Delete" variant="ghost" action={() => deleteLeadAction(leadId)} successMessage="Lead deleted." onDone={() => router.push("/admin/leads")}><Trash2 /></ConfirmAction>;
}
