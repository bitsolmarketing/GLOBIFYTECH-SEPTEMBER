"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Send, Rocket, Archive, Undo2 } from "lucide-react";
import { setCourseStatusAction, saveCompletionRulesAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { enumLabel } from "@/lib/utils";

export function CourseStatusActions({ courseId, slug, status, canPublish, moduleCount }: { courseId: string; slug: string; status: string; canPublish: boolean; moduleCount: number }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const set = (s: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED", confirm?: string) => {
    if (confirm && !window.confirm(confirm)) return;
    start(async () => {
      const res = await setCourseStatusAction(courseId, s);
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(`Course is now ${enumLabel(s).toLowerCase()}.`);
      router.refresh();
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={statusVariant(status)} className="px-3 py-1">{enumLabel(status)}</Badge>
      {status === "PUBLISHED" ? (
        <Button asChild variant="secondary" size="sm"><Link href={`/courses/${slug}`} target="_blank"><ExternalLink /> View live</Link></Button>
      ) : null}
      {status === "DRAFT" && !canPublish ? <Button size="sm" loading={pending} onClick={() => set("IN_REVIEW")}><Send /> Submit for review</Button> : null}
      {status !== "PUBLISHED" && canPublish ? <Button size="sm" loading={pending} disabled={moduleCount === 0} title={moduleCount === 0 ? "Add at least one module first" : undefined} onClick={() => set("PUBLISHED", "Publish this course? It becomes visible on the website.")}><Rocket /> Publish</Button> : null}
      {status === "PUBLISHED" && canPublish ? <Button size="sm" variant="secondary" loading={pending} onClick={() => set("DRAFT", "Unpublish this course? Enrolled students keep access; it disappears from the catalogue.")}><Undo2 /> Unpublish</Button> : null}
      {status !== "ARCHIVED" && canPublish ? <Button size="sm" variant="ghost" loading={pending} onClick={() => set("ARCHIVED", "Archive this course? It will be hidden everywhere but data is kept.")}><Archive /> Archive</Button> : null}
      {status === "IN_REVIEW" && canPublish ? <Button size="sm" variant="ghost" loading={pending} onClick={() => set("DRAFT")}>Send back to draft</Button> : null}
    </div>
  );
}

export function CompletionRulesForm({ courseId, initial }: { courseId: string; initial: { requireAllLessons: boolean; minAttendancePercent: number | null; minQuizPercent: number | null; minExamPercent: number | null; requireProjects: boolean; requirePaymentClear: boolean; autoIssueCertificate: boolean; certificateValidityMonths: number | null } }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      const res = await saveCompletionRulesAction({ courseId, ...form });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Completion rules saved.");
      router.refresh();
    });
  return (
    <div className="grid gap-4">
      {([["requireAllLessons", "Require every lesson to be completed"], ["requireProjects", "Require all projects approved"], ["requirePaymentClear", "Require fees to be cleared"], ["autoIssueCertificate", "Issue certificate automatically on completion"]] as const).map(([k, label]) => (
        <div key={k} className="flex items-center justify-between rounded-lg border border-border p-3">
          <Label htmlFor={`cr-${k}`}>{label}</Label>
          <Switch id={`cr-${k}`} checked={form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: v })} />
        </div>
      ))}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Minimum attendance %" htmlFor="cr-att" hint="Leave blank to ignore attendance"><Input id="cr-att" type="number" min={0} max={100} value={form.minAttendancePercent ?? ""} onChange={(e) => setForm({ ...form, minAttendancePercent: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Minimum quiz average %" htmlFor="cr-quiz"><Input id="cr-quiz" type="number" min={0} max={100} value={form.minQuizPercent ?? ""} onChange={(e) => setForm({ ...form, minQuizPercent: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Minimum exam score %" htmlFor="cr-exam"><Input id="cr-exam" type="number" min={0} max={100} value={form.minExamPercent ?? ""} onChange={(e) => setForm({ ...form, minExamPercent: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="Certificate validity (months)" htmlFor="cr-valid" hint="Blank = never expires"><Input id="cr-valid" type="number" min={1} value={form.certificateValidityMonths ?? ""} onChange={(e) => setForm({ ...form, certificateValidityMonths: e.target.value ? Number(e.target.value) : null })} /></Field>
      </div>
      <Button onClick={save} loading={pending} className="w-fit">Save rules</Button>
    </div>
  );
}
