"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createInstructorAction, updateInstructorAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";

export interface InstructorFormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
  title: string;
  bio: string;
  expertise: string[];
  yearsExperience: number | null;
  linkedinUrl: string;
  websiteUrl: string;
  isFeatured: boolean;
  isPublic: boolean;
  campusId: string;
}

export function InstructorForm({ id, initial, campuses }: { id?: string; initial?: Partial<InstructorFormValues>; campuses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState<InstructorFormValues>({ name: "", email: "", password: "", phone: "", title: "", bio: "", expertise: [], yearsExperience: null, linkedinUrl: "", websiteUrl: "", isFeatured: false, isPublic: true, campusId: campuses[0]?.id ?? "", ...initial });
  const [draft, setDraft] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      setErrors({});
      const payload = { ...form, campusId: form.campusId || null };
      const res = id ? await updateInstructorAction(id, payload) : await createInstructorAction(payload);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success(id ? "Instructor updated." : "Instructor created.");
      router.push(`/admin/instructors/${id ?? (res.data as { id: string }).id}`);
      router.refresh();
    });
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <Field label="Full name" htmlFor="i-name" error={errors.name} required><Input id="i-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Email" htmlFor="i-email" error={errors.email} required hint={id ? "Changing email is not supported here." : "If an account with this email exists, the instructor role is added to it."}><Input id="i-email" type="email" value={form.email} disabled={!!id} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone" htmlFor="i-phone" error={errors.phone}><Input id="i-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={id ? "Reset password" : "Temporary password"} htmlFor="i-pass" error={errors.password} hint="Optional. Minimum 10 characters."><Input id="i-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
      <Field label="Title" htmlFor="i-title" error={errors.title} hint="e.g. Senior Performance Marketer"><Input id="i-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Years of experience" htmlFor="i-years"><Input id="i-years" type="number" min={0} value={form.yearsExperience ?? ""} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value ? Number(e.target.value) : null })} /></Field>
      <Field label="Bio" htmlFor="i-bio" error={errors.bio} className="sm:col-span-2"><Textarea id="i-bio" rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <Label>Expertise</Label>
        <div className="flex flex-wrap gap-1.5">{form.expertise.map((e) => <Badge key={e} variant="accent">{e}<button type="button" aria-label={`Remove ${e}`} onClick={() => setForm({ ...form, expertise: form.expertise.filter((x) => x !== e) })}><X className="size-3" /></button></Badge>)}</div>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); setForm({ ...form, expertise: [...new Set([...form.expertise, draft.trim()])] }); setDraft(""); } }} placeholder="Add a skill and press Enter" />
      </div>
      <Field label="LinkedIn" htmlFor="i-li" error={errors.linkedinUrl}><Input id="i-li" type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></Field>
      <Field label="Website" htmlFor="i-web" error={errors.websiteUrl}><Input id="i-web" type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} /></Field>
      {campuses.length ? <Field label="Campus" htmlFor="i-campus"><SimpleSelect value={form.campusId || "none"} onValueChange={(v) => setForm({ ...form, campusId: v === "none" ? "" : v })} options={[{ value: "none", label: "No campus" }, ...campuses.map((c) => ({ value: c.id, label: c.name }))]} /></Field> : null}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="i-public">Show on public instructors page</Label><Switch id="i-public" checked={form.isPublic} onCheckedChange={(v) => setForm({ ...form, isPublic: v })} /></div>
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="i-featured">Featured on home page</Label><Switch id="i-featured" checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} /></div>
      </div>
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={pending}>{id ? "Save changes" : "Create instructor"}</Button></div>
    </form>
  );
}
