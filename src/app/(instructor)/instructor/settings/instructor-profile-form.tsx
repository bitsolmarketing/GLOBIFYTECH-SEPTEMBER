"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { updateInstructorProfileAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";

export function InstructorProfileForm({ initial }: { initial: { slug: string; title: string; bio: string; expertise: string[]; yearsExperience: number | null; linkedinUrl: string; websiteUrl: string; isPublic: boolean } }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [draft, setDraft] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">Shown on the public instructors page and on your courses.</p>
        <Button asChild variant="ghost" size="sm"><Link href={`/instructors/${form.slug}`} target="_blank"><ExternalLink /> View public profile</Link></Button>
      </div>
      <Field label="Title" htmlFor="ip-title" error={errors.title} hint="e.g. Senior Performance Marketer"><Input id="ip-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Bio" htmlFor="ip-bio" error={errors.bio}><Textarea id="ip-bio" rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
      <div className="flex flex-col gap-2">
        <Label>Expertise</Label>
        <div className="flex flex-wrap gap-1.5">{form.expertise.map((e) => <Badge key={e} variant="accent">{e}<button type="button" aria-label={`Remove ${e}`} onClick={() => setForm({ ...form, expertise: form.expertise.filter((x) => x !== e) })}><X className="size-3" /></button></Badge>)}</div>
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); setForm({ ...form, expertise: [...form.expertise, draft.trim()] }); setDraft(""); } }} placeholder="Add a skill and press Enter" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Years of experience" htmlFor="ip-years"><Input id="ip-years" type="number" min={0} value={form.yearsExperience ?? ""} onChange={(e) => setForm({ ...form, yearsExperience: e.target.value ? Number(e.target.value) : null })} /></Field>
        <Field label="LinkedIn" htmlFor="ip-li" error={errors.linkedinUrl}><Input id="ip-li" type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></Field>
        <Field label="Website" htmlFor="ip-web" error={errors.websiteUrl}><Input id="ip-web" type="url" value={form.websiteUrl} onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })} /></Field>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="ip-public">Show me on the public instructors page</Label><Switch id="ip-public" checked={form.isPublic} onCheckedChange={(v) => setForm({ ...form, isPublic: v })} /></div>
      <Button className="w-fit" loading={pending} onClick={() => start(async () => { setErrors({}); const res = await updateInstructorProfileAction({ title: form.title, bio: form.bio, expertise: form.expertise, yearsExperience: form.yearsExperience, linkedinUrl: form.linkedinUrl, websiteUrl: form.websiteUrl, isPublic: form.isPublic }); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Profile saved."); router.refresh(); })}>Save profile</Button>
    </div>
  );
}
