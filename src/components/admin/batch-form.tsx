"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { saveBatchAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/components/ui/toaster";
import { enumLabel } from "@/lib/utils";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface BatchFormValues {
  code: string;
  name: string;
  courseId: string;
  campusId: string;
  classroomId: string;
  instructorId: string;
  mode: "ON_CAMPUS" | "LIVE_ONLINE" | "HYBRID" | "SELF_PACED";
  capacity: number;
  startDate: string;
  endDate: string;
  status: "PLANNED" | "OPEN" | "RUNNING" | "COMPLETED" | "CANCELLED";
  timezone: string;
  schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
}

export function BatchForm({ id, initial, courses, campuses, classrooms, instructors }: { id?: string; initial?: Partial<BatchFormValues>; courses: Array<{ id: string; title: string }>; campuses: Array<{ id: string; name: string }>; classrooms: Array<{ id: string; name: string; campusId: string }>; instructors: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState<BatchFormValues>({ code: "", name: "", courseId: courses[0]?.id ?? "", campusId: campuses[0]?.id ?? "", classroomId: "", instructorId: "", mode: "HYBRID", capacity: 18, startDate: new Date().toISOString().slice(0, 10), endDate: "", status: "PLANNED", timezone: "Asia/Karachi", schedule: [{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" }], ...initial });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const rooms = classrooms.filter((r) => r.campusId === form.campusId);
  const submit = () =>
    start(async () => {
      setErrors({});
      const res = await saveBatchAction({ code: form.code, name: form.name, courseId: form.courseId, campusId: form.campusId || null, classroomId: form.classroomId || null, instructorId: form.instructorId || null, mode: form.mode, capacity: form.capacity, startDate: new Date(form.startDate), endDate: form.endDate ? new Date(form.endDate) : null, status: form.status, timezone: form.timezone, schedule: form.schedule }, id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success(id ? "Batch updated." : "Batch created.");
      router.push(`/admin/batches/${res.data.id}`);
      router.refresh();
    });
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Field label="Batch code" htmlFor="b-code" error={errors.code} required hint="e.g. DM-2026-03"><Input id="b-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} /></Field>
      <Field label="Name" htmlFor="b-name" error={errors.name} required><Input id="b-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Digital Marketing · Evening" /></Field>
      <Field label="Course" htmlFor="b-course" error={errors.courseId} required><Combobox options={courses.map((c) => ({ value: c.id, label: c.title }))} value={form.courseId} onChange={(v) => setForm({ ...form, courseId: v ?? "" })} placeholder="Select course" /></Field>
      <Field label="Instructor" htmlFor="b-instructor" error={errors.instructorId}><Combobox options={instructors.map((i) => ({ value: i.id, label: i.name }))} value={form.instructorId || null} onChange={(v) => setForm({ ...form, instructorId: v ?? "" })} placeholder="Assign later" clearable /></Field>
      <Field label="Mode" htmlFor="b-mode"><SimpleSelect value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v as BatchFormValues["mode"] })} options={["ON_CAMPUS", "LIVE_ONLINE", "HYBRID", "SELF_PACED"].map((m) => ({ value: m, label: enumLabel(m) }))} /></Field>
      <Field label="Status" htmlFor="b-status"><SimpleSelect value={form.status} onValueChange={(v) => setForm({ ...form, status: v as BatchFormValues["status"] })} options={["PLANNED", "OPEN", "RUNNING", "COMPLETED", "CANCELLED"].map((m) => ({ value: m, label: enumLabel(m) }))} /></Field>
      {campuses.length ? <Field label="Campus" htmlFor="b-campus"><SimpleSelect value={form.campusId || "none"} onValueChange={(v) => setForm({ ...form, campusId: v === "none" ? "" : v, classroomId: "" })} options={[{ value: "none", label: "Online only" }, ...campuses.map((c) => ({ value: c.id, label: c.name }))]} /></Field> : null}
      <Field label="Classroom" htmlFor="b-room"><SimpleSelect value={form.classroomId || "none"} onValueChange={(v) => setForm({ ...form, classroomId: v === "none" ? "" : v })} options={[{ value: "none", label: "Not assigned" }, ...rooms.map((r) => ({ value: r.id, label: r.name }))]} disabled={!rooms.length} /></Field>
      <Field label="Capacity" htmlFor="b-cap" error={errors.capacity} hint="Globify keeps batches at 18 or fewer."><Input id="b-cap" type="number" min={1} max={500} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></Field>
      <Field label="Timezone" htmlFor="b-tz"><Input id="b-tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></Field>
      <Field label="Start date" htmlFor="b-start" error={errors.startDate} required><Input id="b-start" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
      <Field label="End date" htmlFor="b-end" error={errors.endDate}><Input id="b-end" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>
      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between"><p className="text-label">Weekly schedule</p><Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, schedule: [...form.schedule, { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" }] })} disabled={form.schedule.length >= 7}><Plus /> Add day</Button></div>
        <div className="flex flex-col gap-2">
          {form.schedule.map((s, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
              <SimpleSelect value={String(s.dayOfWeek)} onValueChange={(v) => setForm({ ...form, schedule: form.schedule.map((x, i) => (i === idx ? { ...x, dayOfWeek: Number(v) } : x)) })} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} />
              <Input type="time" value={s.startTime} onChange={(e) => setForm({ ...form, schedule: form.schedule.map((x, i) => (i === idx ? { ...x, startTime: e.target.value } : x)) })} className="w-32" aria-label="Start time" />
              <Input type="time" value={s.endTime} onChange={(e) => setForm({ ...form, schedule: form.schedule.map((x, i) => (i === idx ? { ...x, endTime: e.target.value } : x)) })} className="w-32" aria-label="End time" />
              <Button type="button" size="sm" variant="ghost" aria-label="Remove" onClick={() => setForm({ ...form, schedule: form.schedule.filter((_, i) => i !== idx) })}><Trash2 /></Button>
            </div>
          ))}
          {!form.schedule.length ? <p className="text-caption text-fg-muted">No fixed schedule (self-paced or ad-hoc live classes).</p> : null}
        </div>
        {errors.schedule ? <p className="mt-1 text-caption text-danger">{errors.schedule.join(" ")}</p> : null}
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={pending}>{id ? "Save batch" : "Create batch"}</Button></div>
    </form>
  );
}
