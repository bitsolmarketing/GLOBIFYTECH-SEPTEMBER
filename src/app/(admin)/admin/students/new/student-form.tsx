"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { adminCreateStudentAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";

export function StudentForm({ campuses }: { campuses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [form, setForm] = React.useState({ name: "", email: "", phone: "", city: "", password: "", campusId: campuses[0]?.id ?? "" });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); start(async () => { setErrors({}); const res = await adminCreateStudentAction({ ...form, campusId: form.campusId || null }); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Student created."); router.push(`/admin/students/${res.data.id}`); }); }}>
      <Field label="Full name" htmlFor="s-name" error={errors.name} required><Input id="s-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus /></Field>
      <Field label="Email" htmlFor="s-email" error={errors.email} required><Input id="s-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Phone" htmlFor="s-phone" error={errors.phone}><Input id="s-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 3xx xxxxxxx" /></Field>
      <Field label="City" htmlFor="s-city"><Input id="s-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <Field label="Temporary password" htmlFor="s-pass" error={errors.password} hint="Optional. Minimum 10 characters."><Input id="s-pass" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></Field>
      {campuses.length ? <Field label="Campus" htmlFor="s-campus"><SimpleSelect value={form.campusId} onValueChange={(v) => setForm({ ...form, campusId: v })} options={campuses.map((c) => ({ value: c.id, label: c.name }))} /></Field> : null}
      <div className="sm:col-span-2 flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={pending}>Create student</Button></div>
    </form>
  );
}
