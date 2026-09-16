"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, Plus } from "lucide-react";
import { createCourseAction, updateCourseAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";

export interface CourseFormValues {
  title: string;
  slug: string;
  subtitle: string;
  shortDescription: string;
  description: string;
  categoryId: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  mode: "ON_CAMPUS" | "LIVE_ONLINE" | "HYBRID" | "SELF_PACED";
  durationWeeks: number | null;
  hoursPerWeek: number | null;
  language: string;
  price: number;
  discountPrice: number | null;
  currency: string;
  artwork: UploadedFile | null;
  featured: boolean;
  outcomes: string[];
  prerequisites: string[];
  careerOutcomes: string[];
  faqs: Array<{ question: string; answer: string }>;
  skillIds: string[];
  instructorIds: string[];
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
  leaderboardEnabled: boolean;
  campusId: string | null;
}

export interface CourseFormProps {
  courseId?: string;
  initial: CourseFormValues;
  categories: Array<{ id: string; name: string }>;
  skills: Array<{ id: string; name: string }>;
  instructors: Array<{ id: string; name: string }>;
  campuses: Array<{ id: string; name: string }>;
  canAssignInstructors: boolean;
}

function ListEditor({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = React.useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...values, draft.trim()]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <ul className="flex flex-col gap-1.5">
        {values.map((v, i) => (
          <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle px-3 py-1.5 text-sm">
            <span className="flex-1">{v}</span>
            <button type="button" onClick={() => onChange(values.filter((_, j) => j !== i))} className="text-fg-subtle hover:text-danger" aria-label="Remove"><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <Button type="button" variant="secondary" onClick={add}><Plus /></Button>
      </div>
    </div>
  );
}

export function CourseForm({ courseId, initial, categories, skills, instructors, campuses, canAssignInstructors }: CourseFormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const set = <K extends keyof CourseFormValues>(k: K, v: CourseFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () =>
    start(async () => {
      setErrors({});
      const payload = { ...form, slug: form.slug || undefined, artworkMediaId: form.artwork?.mediaId ?? null, promoVideoMediaId: null, durationWeeks: form.durationWeeks ?? null, hoursPerWeek: form.hoursPerWeek ?? null, discountPrice: form.discountPrice ?? null };
      const res = courseId ? await updateCourseAction(courseId, payload) : await createCourseAction(payload);
      if (!res.ok) {
        setErrors(res.error.fields ?? {});
        toast.error(res.error.message);
        return;
      }
      toast.success(courseId ? "Course saved." : "Course created as a draft.");
      if (!courseId && res.data) router.push(`/instructor/course/${(res.data as { id: string }).id}`);
      else router.refresh();
    });

  return (
    <div className="flex flex-col gap-6">
      <Tabs defaultValue="basics">
        <TabsList>
          <TabsTrigger value="basics">Basics</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="basics" className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="c-title" error={errors.title} required className="sm:col-span-2"><Input id="c-title" value={form.title} onChange={(e) => set("title", e.target.value)} /></Field>
            <Field label="Subtitle" htmlFor="c-subtitle" error={errors.subtitle} className="sm:col-span-2"><Input id="c-subtitle" value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} placeholder="One line that sells the outcome" /></Field>
            <Field label="Slug" htmlFor="c-slug" error={errors.slug} hint="Leave blank to generate from the title"><Input id="c-slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} /></Field>
            <Field label="Category" htmlFor="c-cat" error={errors.categoryId}><Combobox options={categories.map((c) => ({ value: c.id, label: c.name }))} value={form.categoryId} onChange={(v) => set("categoryId", v)} placeholder="Choose a category" /></Field>
            <Field label="Level" htmlFor="c-level"><SimpleSelect value={form.level} onValueChange={(v) => set("level", v as CourseFormValues["level"])} options={[{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }]} /></Field>
            <Field label="Learning mode" htmlFor="c-mode"><SimpleSelect value={form.mode} onValueChange={(v) => set("mode", v as CourseFormValues["mode"])} options={[{ value: "ON_CAMPUS", label: "On campus" }, { value: "LIVE_ONLINE", label: "Live online" }, { value: "HYBRID", label: "Hybrid" }, { value: "SELF_PACED", label: "Self-paced" }]} /></Field>
            <Field label="Duration (weeks)" htmlFor="c-weeks" error={errors.durationWeeks}><Input id="c-weeks" type="number" min={1} value={form.durationWeeks ?? ""} onChange={(e) => set("durationWeeks", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Hours per week" htmlFor="c-hpw" error={errors.hoursPerWeek}><Input id="c-hpw" type="number" min={1} value={form.hoursPerWeek ?? ""} onChange={(e) => set("hoursPerWeek", e.target.value ? Number(e.target.value) : null)} /></Field>
            <Field label="Campus (optional)" htmlFor="c-campus"><Combobox options={campuses.map((c) => ({ value: c.id, label: c.name }))} value={form.campusId} onChange={(v) => set("campusId", v)} placeholder="All campuses" /></Field>
            <Field label="Language" htmlFor="c-lang"><SimpleSelect value={form.language} onValueChange={(v) => set("language", v)} options={[{ value: "en", label: "English (+ Urdu)" }, { value: "ur", label: "Urdu" }]} /></Field>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Skills</Label>
            <div className="flex flex-wrap gap-1.5">
              {form.skillIds.map((id) => { const s = skills.find((x) => x.id === id); return s ? <Badge key={id} variant="accent">{s.name}<button type="button" onClick={() => set("skillIds", form.skillIds.filter((x) => x !== id))} aria-label="Remove"><X className="size-3" /></button></Badge> : null; })}
            </div>
            <Combobox options={skills.filter((s) => !form.skillIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} value={null} onChange={(v) => v && set("skillIds", [...form.skillIds, v])} placeholder="Add a skill…" clearable={false} />
          </div>
          {canAssignInstructors ? (
            <div className="flex flex-col gap-2">
              <Label>Instructors</Label>
              <div className="flex flex-wrap gap-1.5">
                {form.instructorIds.map((id, i) => { const s = instructors.find((x) => x.id === id); return s ? <Badge key={id} variant={i === 0 ? "accent" : "default"}>{s.name}{i === 0 ? " · lead" : ""}<button type="button" onClick={() => set("instructorIds", form.instructorIds.filter((x) => x !== id))} aria-label="Remove"><X className="size-3" /></button></Badge> : null; })}
              </div>
              <Combobox options={instructors.filter((s) => !form.instructorIds.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))} value={null} onChange={(v) => v && set("instructorIds", [...form.instructorIds, v])} placeholder="Add an instructor…" clearable={false} />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="c-featured">Featured on homepage</Label><Switch id="c-featured" checked={form.featured} onCheckedChange={(v) => set("featured", v)} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="c-lb">Course leaderboard</Label><Switch id="c-lb" checked={form.leaderboardEnabled} onCheckedChange={(v) => set("leaderboardEnabled", v)} /></div>
          </div>
        </TabsContent>
        <TabsContent value="content" className="grid gap-4">
          <Field label="Short description" htmlFor="c-short" error={errors.shortDescription} hint="Shown on cards and in search (max 400 chars)"><Textarea id="c-short" rows={3} value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
          <div className="flex flex-col gap-2"><Label>Full description</Label><RichTextEditor value={form.description} onChange={(v) => set("description", v)} minHeight={280} placeholder="Who this course is for, how it's taught, what you'll build…" /></div>
          <div className="flex flex-col gap-2"><Label>Artwork</Label><FileUploader kind="image" accept="image/*" maxSizeMb={10} folder="courses" value={form.artwork ? [form.artwork] : []} onChange={(f) => set("artwork", f[0] ?? null)} hint="16:9 recommended · leave empty to use the category artwork" /></div>
        </TabsContent>
        <TabsContent value="outcomes" className="grid gap-6">
          <ListEditor label="What you'll learn" values={form.outcomes} onChange={(v) => set("outcomes", v)} placeholder="Run profitable Meta ad campaigns…" />
          <ListEditor label="Prerequisites" values={form.prerequisites} onChange={(v) => set("prerequisites", v)} placeholder="Basic computer skills" />
          <ListEditor label="Career outcomes" values={form.careerOutcomes} onChange={(v) => set("careerOutcomes", v)} placeholder="Performance Marketing Specialist" />
          <div className="flex flex-col gap-2">
            <Label>FAQs</Label>
            {form.faqs.map((f, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
                <Input value={f.question} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} placeholder="Question" />
                <Textarea rows={2} value={f.answer} onChange={(e) => set("faqs", form.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} placeholder="Answer" />
                <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => set("faqs", form.faqs.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => set("faqs", [...form.faqs, { question: "", answer: "" }])}><Plus /> Add FAQ</Button>
          </div>
        </TabsContent>
        <TabsContent value="pricing" className="grid gap-4 sm:grid-cols-3">
          <Field label="Price" htmlFor="c-price" error={errors.price}><Input id="c-price" type="number" min={0} value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
          <Field label="Discount price" htmlFor="c-disc" error={errors.discountPrice}><Input id="c-disc" type="number" min={0} value={form.discountPrice ?? ""} onChange={(e) => set("discountPrice", e.target.value ? Number(e.target.value) : null)} /></Field>
          <Field label="Currency" htmlFor="c-cur"><SimpleSelect value={form.currency} onValueChange={(v) => set("currency", v)} options={[{ value: "PKR", label: "PKR" }, { value: "USD", label: "USD" }]} /></Field>
          <p className="text-caption text-fg-muted sm:col-span-3">Installment plans are configured by finance under the course’s fee plans after the course is saved.</p>
        </TabsContent>
        <TabsContent value="seo" className="grid gap-4">
          <Field label="SEO title" htmlFor="c-seot" error={errors.seoTitle} hint="Up to 70 characters"><Input id="c-seot" value={form.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} /></Field>
          <Field label="SEO description" htmlFor="c-seod" error={errors.seoDescription} hint="Up to 160 characters"><Textarea id="c-seod" rows={3} value={form.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} /></Field>
          <div className="flex items-center justify-between rounded-lg border border-border p-3"><Label htmlFor="c-noindex">Hide from search engines</Label><Switch id="c-noindex" checked={form.noindex} onCheckedChange={(v) => set("noindex", v)} /></div>
        </TabsContent>
      </Tabs>
      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button onClick={save} loading={pending}>{courseId ? "Save changes" : "Create draft course"}</Button>
      </div>
    </div>
  );
}
