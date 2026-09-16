"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck } from "lucide-react";
import { updateProfileAction, updateAvatarAction } from "@/server/actions/student";
import { changePasswordAction, signOutEverywhereAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";

export interface ProfileFormValues {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  locale: string;
  timezone: string;
  headline: string;
  bio: string;
  city: string;
  githubUrl: string;
  linkedinUrl: string;
  websiteUrl: string;
  avatarUrl: string | null;
}

const TIMEZONES = ["Asia/Karachi", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "America/New_York", "Asia/Kolkata", "Australia/Sydney"];

export function ProfileForm({ initial, showStudentFields }: { initial: ProfileFormValues; showStudentFields: boolean }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const set = (k: keyof ProfileFormValues, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = () =>
    start(async () => {
      setErrors({});
      const res = await updateProfileAction({ name: form.name, phone: form.phone, whatsapp: form.whatsapp, locale: form.locale as "en", timezone: form.timezone, headline: form.headline, bio: form.bio, city: form.city, githubUrl: form.githubUrl, linkedinUrl: form.linkedinUrl, websiteUrl: form.websiteUrl });
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        { toast.error(res.error.message); return; }
      }
      toast.success("Profile saved.");
      router.refresh();
    });
  const onAvatar = (files: UploadedFile[]) =>
    start(async () => {
      const res = await updateAvatarAction(files[0]?.mediaId ?? null);
      if (!res.ok) { toast.error(res.error.message); return; }
      setForm((f) => ({ ...f, avatarUrl: files[0]?.url ?? null }));
      toast.success("Photo updated.");
      router.refresh();
    });
  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4">
        <Avatar name={form.name} src={form.avatarUrl} size="xl" />
        <div className="flex-1">
          <FileUploader kind="image" accept="image/*" maxSizeMb={5} folder="avatars" onChange={onAvatar} hint="Square image, up to 5 MB" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="pf-name" error={errors.name}><Input id="pf-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Email" htmlFor="pf-email" hint="Contact support to change your email"><Input id="pf-email" value={form.email} disabled /></Field>
        <Field label="Phone" htmlFor="pf-phone" error={errors.phone}><Input id="pf-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="WhatsApp" htmlFor="pf-wa" error={errors.whatsapp}><Input id="pf-wa" type="tel" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></Field>
        <Field label="Language" htmlFor="pf-locale"><SimpleSelect value={form.locale} onValueChange={(v) => set("locale", v)} options={LOCALES.map((l) => ({ value: l, label: LOCALE_LABELS[l] }))} /></Field>
        <Field label="Timezone" htmlFor="pf-tz"><SimpleSelect value={form.timezone} onValueChange={(v) => set("timezone", v)} options={TIMEZONES.map((t) => ({ value: t, label: t }))} /></Field>
      </div>
      {showStudentFields ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="City" htmlFor="pf-city"><Input id="pf-city" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Headline" htmlFor="pf-headline" error={errors.headline}><Input id="pf-headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} /></Field>
          <Field label="Bio" htmlFor="pf-bio" className="sm:col-span-2" error={errors.bio}><Textarea id="pf-bio" rows={3} value={form.bio} onChange={(e) => set("bio", e.target.value)} /></Field>
          <Field label="GitHub" htmlFor="pf-gh" error={errors.githubUrl}><Input id="pf-gh" type="url" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} /></Field>
          <Field label="LinkedIn" htmlFor="pf-li" error={errors.linkedinUrl}><Input id="pf-li" type="url" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} /></Field>
        </div>
      ) : null}
      <Button onClick={save} loading={pending} className="w-fit">Save changes</Button>
    </div>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, null);
  const errors = state && !state.ok ? state.error.fields : undefined;
  return (
    <form action={action} className="grid max-w-md gap-4" noValidate>
      {state?.ok ? <Alert variant="success">Password updated.</Alert> : null}
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label="Current password" htmlFor="cur" error={errors?.currentPassword}><Input id="cur" name="currentPassword" type="password" autoComplete="current-password" required /></Field>
      <Field label="New password" htmlFor="new" error={errors?.password} hint="At least 10 characters with letters and numbers"><Input id="new" name="password" type="password" autoComplete="new-password" required /></Field>
      <Field label="Confirm new password" htmlFor="confirm" error={errors?.confirmPassword}><Input id="confirm" name="confirmPassword" type="password" autoComplete="new-password" required /></Field>
      <Button type="submit" loading={pending} className="w-fit">Update password</Button>
    </form>
  );
}

export function SecurityActions() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-body-sm text-fg-muted">Signed in somewhere you don’t recognise? Sign out of every device, including this one.</p>
      <Button
        variant="secondary"
        className="w-fit"
        loading={pending}
        onClick={() => {
          if (!window.confirm("Sign out of all devices?")) return;
          start(async () => {
            const res = await signOutEverywhereAction();
            if (!res.ok) { toast.error(res.error.message); return; }
            router.push("/sign-in");
          });
        }}
      >
        <LogOut /> Sign out everywhere
      </Button>
      <p className="inline-flex items-center gap-1.5 text-caption text-fg-subtle"><ShieldCheck className="size-3.5" /> Sessions are encrypted and expire after 30 days.</p>
    </div>
  );
}
