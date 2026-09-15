"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, MapPin, Check, Sparkles, X } from "lucide-react";
import { applyToJobAction, setSkillsAction, updateCareerProfileAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { ProgressRing } from "@/components/ui/progress";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel, formatMoney } from "@/lib/utils";

export interface OpportunityCard {
  id: string;
  kind: "job" | "internship";
  title: string;
  employer: { name: string; isHiringPartner: boolean; logo?: { url: string } | null };
  location: string | null;
  isRemote: boolean;
  type?: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  stipend?: number | null;
  durationWeeks?: number | null;
  currency: string;
  skills: Array<{ id: string; name: string; required: boolean }>;
  match: { percent: number; matchedSkillIds: string[]; missingRequiredSkillIds: string[] };
  appliedStatus: string | null;
}

export function OpportunityList({ items, cvMediaId }: { items: OpportunityCard[]; cvMediaId: string | null }) {
  const router = useRouter();
  const [open, setOpen] = React.useState<OpportunityCard | null>(null);
  const [cover, setCover] = React.useState("");
  const [pending, start] = React.useTransition();
  const apply = () => {
    if (!open) return;
    start(async () => {
      const res = await applyToJobAction({ jobId: open.kind === "job" ? open.id : null, internshipId: open.kind === "internship" ? open.id : null, coverLetter: cover, cvMediaId });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Application sent. The employer will see your profile and match score.");
      setOpen(null);
      setCover("");
      router.refresh();
    });
  };
  if (!items.length) return <p className="text-body-sm text-fg-muted">No open opportunities right now. Hiring partners post new roles every month.</p>;
  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map((o) => (
          <li key={o.id} className="surface flex flex-col gap-3 p-5">
            <div className="flex items-start gap-3">
              <ProgressRing value={o.match.percent} size={56} stroke={5} tone={o.match.percent >= 70 ? "success" : "accent"}>
                <span className="text-caption font-semibold">{o.match.percent}%</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <h3 className="text-h4 truncate">{o.title}</h3>
                <p className="inline-flex flex-wrap items-center gap-x-2 text-caption text-fg-muted">
                  <span className="inline-flex items-center gap-1"><Building2 className="size-3.5" /> {o.employer.name}</span>
                  {o.employer.isHiringPartner ? <Badge variant="accent">Partner</Badge> : null}
                  <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {o.isRemote ? "Remote" : (o.location ?? "Pakistan")}</span>
                </p>
              </div>
              <Badge>{o.kind === "job" ? enumLabel(o.type ?? "JOB") : "Internship"}</Badge>
            </div>
            <p className="text-caption text-fg-muted">
              {o.kind === "job" && (o.salaryMin || o.salaryMax) ? [o.salaryMin && formatMoney(o.salaryMin, o.currency), o.salaryMax && formatMoney(o.salaryMax, o.currency)].filter(Boolean).join(" – ") : null}
              {o.kind === "internship" ? `${o.durationWeeks ? `${o.durationWeeks} weeks` : ""}${o.stipend ? ` · stipend ${formatMoney(o.stipend, o.currency)}` : ""}` : null}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {o.skills.map((s) => (
                <Badge key={s.id} variant={o.match.matchedSkillIds.includes(s.id) ? "success" : s.required ? "warning" : "default"}>
                  {o.match.matchedSkillIds.includes(s.id) ? <Check className="size-3" /> : null}
                  {s.name}
                </Badge>
              ))}
            </div>
            <div className="mt-auto flex items-center justify-between pt-1">
              {o.match.missingRequiredSkillIds.length ? <span className="text-caption text-fg-subtle">{o.match.missingRequiredSkillIds.length} required skill{o.match.missingRequiredSkillIds.length === 1 ? "" : "s"} missing</span> : <span className="text-caption text-success">Strong match</span>}
              {o.appliedStatus ? <Badge variant="info">{enumLabel(o.appliedStatus)}</Badge> : <Button size="sm" onClick={() => setOpen(o)}><Briefcase /> Apply</Button>}
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply to {open?.title}</DialogTitle>
            <DialogDescription>Your Globify profile, verified skills and certificates are shared with {open?.employer.name}.</DialogDescription>
          </DialogHeader>
          <Field label="Cover note (optional)" htmlFor="cover">
            <Textarea id="cover" rows={5} value={cover} onChange={(e) => setCover(e.target.value)} placeholder="Why you, in a few lines." />
          </Field>
          {!cvMediaId ? <p className="text-caption text-warning">Tip: upload a CV in your career profile to strengthen your application.</p> : null}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={apply} loading={pending}>Send application</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SkillsEditor({ allSkills, initial }: { allSkills: Array<{ id: string; name: string }>; initial: Array<{ skillId: string; level: number; verified: boolean; name: string }> }) {
  const router = useRouter();
  const [skills, setSkills] = React.useState(initial);
  const [adding, setAdding] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const save = () =>
    start(async () => {
      const res = await setSkillsAction({ skills: skills.filter((s) => !s.verified).map((s) => ({ skillId: s.skillId, level: s.level })) });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Skills saved.");
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {skills.map((s) => (
          <span key={s.skillId} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm", s.verified ? "border-accent/30 bg-accent-soft text-accent" : "border-border")}>
            {s.verified ? <Sparkles className="size-3.5" /> : null}
            {s.name}
            {!s.verified ? (
              <>
                <select value={s.level} onChange={(e) => setSkills((x) => x.map((y) => (y.skillId === s.skillId ? { ...y, level: Number(e.target.value) } : y)))} className="bg-transparent text-caption text-fg-muted" aria-label={`${s.name} level`}>
                  {[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>L{l}</option>)}
                </select>
                <button type="button" onClick={() => setSkills((x) => x.filter((y) => y.skillId !== s.skillId))} className="text-fg-subtle hover:text-danger" aria-label={`Remove ${s.name}`}><X className="size-3.5" /></button>
              </>
            ) : null}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Combobox options={allSkills.filter((s) => !skills.some((x) => x.skillId === s.id)).map((s) => ({ value: s.id, label: s.name }))} value={adding} onChange={(v) => { if (v) { const s = allSkills.find((x) => x.id === v)!; setSkills((x) => [...x, { skillId: s.id, name: s.name, level: 3, verified: false }]); } setAdding(null); }} placeholder="Add a skill…" />
        </div>
        <Button onClick={save} loading={pending}>Save skills</Button>
      </div>
      <p className="text-caption text-fg-subtle">Skills marked with a spark are verified by completed courses and boost your match scores.</p>
    </div>
  );
}

export function CareerProfileForm({ initial }: { initial: { headline: string; bio: string; githubUrl: string; linkedinUrl: string; websiteUrl: string; cv: UploadedFile | null; freelanceProfiles: Array<{ platform: string; url: string }> } }) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [pending, start] = React.useTransition();
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const save = () =>
    start(async () => {
      const res = await updateCareerProfileAction({ headline: form.headline, bio: form.bio, githubUrl: form.githubUrl, linkedinUrl: form.linkedinUrl, websiteUrl: form.websiteUrl, cvMediaId: form.cv?.mediaId ?? null, freelanceProfiles: form.freelanceProfiles.filter((p) => p.platform && p.url) });
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        { toast.error(res.error.message); return; }
      }
      toast.success("Career profile saved.");
      router.refresh();
    });
  const set = (k: keyof typeof form, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="grid gap-4">
      <Field label="Headline" htmlFor="cp-headline" error={errors.headline} hint="e.g. Performance marketer · Meta & Google Ads">
        <Input id="cp-headline" value={form.headline} onChange={(e) => set("headline", e.target.value)} />
      </Field>
      <Field label="About you" htmlFor="cp-bio" error={errors.bio}>
        <Textarea id="cp-bio" rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="GitHub" htmlFor="cp-gh" error={errors.githubUrl}><Input id="cp-gh" type="url" value={form.githubUrl} onChange={(e) => set("githubUrl", e.target.value)} placeholder="https://github.com/…" /></Field>
        <Field label="LinkedIn" htmlFor="cp-li" error={errors.linkedinUrl}><Input id="cp-li" type="url" value={form.linkedinUrl} onChange={(e) => set("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
        <Field label="Website" htmlFor="cp-web" error={errors.websiteUrl}><Input id="cp-web" type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} /></Field>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Freelance profiles</p>
        {form.freelanceProfiles.map((p, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[160px_1fr_auto]">
            <Input value={p.platform} onChange={(e) => set("freelanceProfiles", form.freelanceProfiles.map((x, j) => (j === i ? { ...x, platform: e.target.value } : x)))} placeholder="Upwork / Fiverr" />
            <Input type="url" value={p.url} onChange={(e) => set("freelanceProfiles", form.freelanceProfiles.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} placeholder="https://" />
            <Button variant="ghost" size="icon" onClick={() => set("freelanceProfiles", form.freelanceProfiles.filter((_, j) => j !== i))} aria-label="Remove"><X /></Button>
          </div>
        ))}
        {form.freelanceProfiles.length < 6 ? <Button variant="secondary" size="sm" className="w-fit" onClick={() => set("freelanceProfiles", [...form.freelanceProfiles, { platform: "", url: "" }])}>Add profile</Button> : null}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">CV</p>
        <FileUploader kind="document" accept=".pdf,.doc,.docx" maxSizeMb={10} folder="cv" value={form.cv ? [form.cv] : []} onChange={(f) => set("cv", f[0] ?? null)} hint="PDF or DOCX · up to 10 MB" />
      </div>
      <Button onClick={save} loading={pending} className="w-fit">Save profile</Button>
    </div>
  );
}
