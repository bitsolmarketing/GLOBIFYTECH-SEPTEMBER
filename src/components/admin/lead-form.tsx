"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createLeadAction, updateLeadAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "@/components/ui/toaster";
import { enumLabel } from "@/lib/utils";

const SOURCES = ["WALK_IN", "PHONE", "WHATSAPP", "WEBSITE", "FACEBOOK", "INSTAGRAM", "GOOGLE", "REFERRAL", "EVENT", "ORGANIC"] as const;
const MODES = ["ON_CAMPUS", "LIVE_ONLINE", "HYBRID", "SELF_PACED"] as const;

export interface LeadFormValues {
  name: string; phone: string; whatsapp: string; email: string; city: string; education: string; courseId: string; interest: string; source: (typeof SOURCES)[number]; campaignId: string; counsellorId: string; preferredMode: (typeof MODES)[number] | ""; message: string; nextFollowUpAt: string;
}

export function LeadForm({ id, initial, courses, counsellors, campaigns, onSaved }: { id?: string; initial?: Partial<LeadFormValues>; courses: Array<{ id: string; title: string }>; counsellors: Array<{ id: string; name: string }>; campaigns: Array<{ id: string; name: string }>; onSaved?: () => void }) {
  const router = useRouter();
  const [form, setForm] = React.useState<LeadFormValues>({ name: "", phone: "", whatsapp: "", email: "", city: "Faisalabad", education: "", courseId: "", interest: "", source: "WALK_IN", campaignId: "", counsellorId: "", preferredMode: "", message: "", nextFollowUpAt: "", ...initial });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      setErrors({});
      const payload = { ...form, courseId: form.courseId || null, campaignId: form.campaignId || null, counsellorId: form.counsellorId || null, preferredMode: form.preferredMode || null, nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt) : null };
      const res = id ? await updateLeadAction(id, payload) : await createLeadAction(payload);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success(id ? "Lead updated." : "Lead created.");
      if (onSaved) onSaved();
      else router.push(`/admin/leads/${id ?? (res.data as { id: string }).id}`);
      router.refresh();
    });
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Field label="Full name" htmlFor="l-name" error={errors.name} required><Input id="l-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus={!id} /></Field>
      <Field label="Phone" htmlFor="l-phone" error={errors.phone}><Input id="l-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" /></Field>
      <Field label="WhatsApp" htmlFor="l-wa" error={errors.whatsapp} hint="Leave blank if same as phone."><Input id="l-wa" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
      <Field label="Email" htmlFor="l-email" error={errors.email}><Input id="l-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="City" htmlFor="l-city"><Input id="l-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <Field label="Education" htmlFor="l-edu"><Input id="l-edu" value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} placeholder="Intermediate, BS, …" /></Field>
      <Field label="Interested course" htmlFor="l-course"><Combobox options={courses.map((c) => ({ value: c.id, label: c.title }))} value={form.courseId || null} onChange={(v) => setForm({ ...form, courseId: v ?? "" })} placeholder="Not decided" clearable /></Field>
      <Field label="Interest / notes" htmlFor="l-interest"><Input id="l-interest" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} placeholder="Wants evening classes" /></Field>
      <Field label="Source" htmlFor="l-source"><SimpleSelect value={form.source} onValueChange={(v) => setForm({ ...form, source: v as LeadFormValues["source"] })} options={SOURCES.map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
      <Field label="Campaign" htmlFor="l-campaign"><SimpleSelect value={form.campaignId || "none"} onValueChange={(v) => setForm({ ...form, campaignId: v === "none" ? "" : v })} options={[{ value: "none", label: "No campaign" }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
      <Field label="Counsellor" htmlFor="l-counsellor"><SimpleSelect value={form.counsellorId || "none"} onValueChange={(v) => setForm({ ...form, counsellorId: v === "none" ? "" : v })} options={[{ value: "none", label: "Unassigned" }, ...counsellors.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
      <Field label="Preferred mode" htmlFor="l-mode"><SimpleSelect value={form.preferredMode || "none"} onValueChange={(v) => setForm({ ...form, preferredMode: v === "none" ? "" : (v as LeadFormValues["preferredMode"]) })} options={[{ value: "none", label: "Any" }, ...MODES.map((m) => ({ value: m, label: enumLabel(m) }))]} /></Field>
      <Field label="Next follow-up" htmlFor="l-follow"><Input id="l-follow" type="datetime-local" value={form.nextFollowUpAt} onChange={(e) => setForm({ ...form, nextFollowUpAt: e.target.value })} /></Field>
      <Field label="Message" htmlFor="l-msg" className="sm:col-span-2"><Textarea id="l-msg" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => (onSaved ? onSaved() : router.back())}>Cancel</Button><Button type="submit" loading={pending}>{id ? "Save lead" : "Create lead"}</Button></div>
    </form>
  );
}
