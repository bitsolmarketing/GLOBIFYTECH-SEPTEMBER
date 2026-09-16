"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Video, Plus } from "lucide-react";
import { scheduleLiveClassAction, updateLiveClassAction, postAnnouncementAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

export function ScheduleLiveClassDialog({ courses, batches, defaultOpen, defaultBatchId, liveDriver }: { courses: Array<{ id: string; title: string }>; batches: Array<{ id: string; name: string; courseId: string }>; defaultOpen?: boolean; defaultBatchId?: string; liveDriver: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(!!defaultOpen);
  const defaultBatch = batches.find((b) => b.id === defaultBatchId);
  const [form, setForm] = React.useState({ courseId: defaultBatch?.courseId ?? courses[0]?.id ?? "", batchId: defaultBatchId ?? null, title: "", description: "", startsAt: "", endsAt: "", provider: liveDriver === "zoom" ? "ZOOM" : "MANUAL", meetingUrl: "", meetingId: "", meetingPasscode: "" });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      setErrors({});
      const res = await scheduleLiveClassAction({ ...form, provider: form.provider as never, startsAt: new Date(form.startsAt), endsAt: new Date(form.endsAt), lessonId: null });
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Live class scheduled. Students have been notified.");
      setOpen(false);
      router.refresh();
    });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus /> Schedule class</Button></DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader><DialogTitle>Schedule a live class</DialogTitle></DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Course" htmlFor="lc-course" error={errors.courseId}><SimpleSelect value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v, batchId: null })} options={courses.map((c) => ({ value: c.id, label: c.title }))} /></Field>
            <Field label="Batch" htmlFor="lc-batch" hint="Leave empty to invite every active student"><Combobox options={batches.filter((b) => b.courseId === form.courseId).map((b) => ({ value: b.id, label: b.name }))} value={form.batchId} onChange={(v) => setForm({ ...form, batchId: v })} placeholder="All students in course" /></Field>
          </div>
          <Field label="Title" htmlFor="lc-title" error={errors.title}><Input id="lc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Week 3 · Campaign structure live build" /></Field>
          <Field label="Description" htmlFor="lc-desc"><Textarea id="lc-desc" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" htmlFor="lc-start" error={errors.startsAt}><Input id="lc-start" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></Field>
            <Field label="Ends" htmlFor="lc-end" error={errors.endsAt}><Input id="lc-end" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Platform" htmlFor="lc-prov"><SimpleSelect value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })} options={[{ value: "MANUAL", label: "Paste a link (any platform)" }, { value: "ZOOM", label: liveDriver === "zoom" ? "Zoom (auto-create)" : "Zoom (paste link)" }, { value: "GOOGLE_MEET", label: "Google Meet (paste link)" }, { value: "MICROSOFT_TEAMS", label: "Microsoft Teams (paste link)" }]} /></Field>
            <Field label="Meeting link" htmlFor="lc-url" error={errors.meetingUrl} hint={form.provider === "ZOOM" && liveDriver === "zoom" ? "Leave blank to create the meeting automatically" : undefined}><Input id="lc-url" type="url" value={form.meetingUrl} onChange={(e) => setForm({ ...form, meetingUrl: e.target.value })} placeholder="https://" /></Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} loading={pending} disabled={!form.title || !form.startsAt || !form.endsAt}><Video /> Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LiveClassActions({ liveClass }: { liveClass: { id: string; status: string; notes: string | null; hasRecording: boolean } }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ status: liveClass.status, notes: liveClass.notes ?? "", recordingUrl: "", transcript: "" });
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      const res = await updateLiveClassAction({ liveClassId: liveClass.id, status: form.status as never, notes: form.notes, recordingUrl: form.recordingUrl, transcript: form.transcript });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Class updated.");
      setOpen(false);
      router.refresh();
    });
  const quick = (status: "LIVE" | "COMPLETED" | "CANCELLED") =>
    start(async () => {
      if (status === "CANCELLED" && !window.confirm("Cancel this class? Students will be notified.")) return;
      const res = await updateLiveClassAction({ liveClassId: liveClass.id, status });
      if (!res.ok) { toast.error(res.error.message); return; }
      router.refresh();
    });
  return (
    <div className="flex flex-wrap gap-1">
      {liveClass.status === "SCHEDULED" ? <Button size="sm" variant="secondary" onClick={() => quick("LIVE")} loading={pending}>Go live</Button> : null}
      {liveClass.status === "LIVE" ? <Button size="sm" onClick={() => quick("COMPLETED")} loading={pending}>End class</Button> : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" variant="ghost">Details</Button></DialogTrigger>
        <DialogContent size="lg">
          <DialogHeader><DialogTitle>After the class</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Field label="Status" htmlFor="lcu-status"><SimpleSelect value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} options={[{ value: "SCHEDULED", label: "Scheduled" }, { value: "LIVE", label: "Live" }, { value: "COMPLETED", label: "Completed" }, { value: "CANCELLED", label: "Cancelled" }]} /></Field>
            <Field label="Recording URL" htmlFor="lcu-rec" hint={liveClass.hasRecording ? "A recording is already attached; adding another keeps both." : undefined}><Input id="lcu-rec" type="url" value={form.recordingUrl} onChange={(e) => setForm({ ...form, recordingUrl: e.target.value })} placeholder="https://" /></Field>
            <Field label="Notes for students" htmlFor="lcu-notes"><Textarea id="lcu-notes" rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <Field label="Transcript (optional)" htmlFor="lcu-tr" hint="Paste the transcript and Globify AI writes a summary and revision questions when the class is marked completed."><Textarea id="lcu-tr" rows={5} value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => quick("CANCELLED")} loading={pending}>Cancel class</Button>
            <Button onClick={save} loading={pending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AnnouncementForm({ batchId, courseId }: { batchId?: string | null; courseId?: string | null }) {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [pinned, setPinned] = React.useState(false);
  const [notify, setNotify] = React.useState(true);
  const [pending, start] = React.useTransition();
  return (
    <div className="grid gap-3">
      <Field label="Title" htmlFor="an-title"><Input id="an-title" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="Message" htmlFor="an-body"><Textarea id="an-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      <div className="flex gap-6 text-body-sm">
        <label className="flex items-center gap-2"><Checkbox checked={pinned} onCheckedChange={(v) => setPinned(!!v)} /> Pin</label>
        <label className="flex items-center gap-2"><Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} /> Send notification</label>
      </div>
      <Button className="w-fit" loading={pending} disabled={!title.trim() || !body.trim()} onClick={() => start(async () => { const res = await postAnnouncementAction({ batchId: batchId ?? null, courseId: batchId ? null : (courseId ?? null), title, body, isPinned: pinned, notify, expiresAt: null }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Announcement posted."); setTitle(""); setBody(""); router.refresh(); })}>Post announcement</Button>
    </div>
  );
}
