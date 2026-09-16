"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SimpleSelect } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

/** Section catalogue shown in the page builder. Mirrors sectionDataSchemas. */
export const SECTION_TYPES = [
  { key: "HERO", label: "Hero", description: "Headline, subheadline and calls to action, with the 3D scene." },
  { key: "FEATURES", label: "Features", description: "A grid, list or bento of benefits." },
  { key: "COURSE_GRID", label: "Course grid", description: "Featured, latest, category or hand-picked courses." },
  { key: "PROGRAM_GRID", label: "Programs", description: "Published programs." },
  { key: "LEARNING_PATHS", label: "Learning paths", description: "Guided routes to a career outcome." },
  { key: "STATS", label: "Stats", description: "Numbers that build trust." },
  { key: "TESTIMONIALS", label: "Testimonials", description: "Approved student quotes." },
  { key: "SUCCESS_STORIES", label: "Success stories", description: "Long-form alumni outcomes." },
  { key: "INSTRUCTOR_GRID", label: "Instructors", description: "Public instructor profiles." },
  { key: "TEXT", label: "Rich text", description: "Formatted copy with an optional title." },
  { key: "IMAGE", label: "Image", description: "A single image with a caption." },
  { key: "VIDEO", label: "Video", description: "Embedded or uploaded video." },
  { key: "GALLERY", label: "Gallery", description: "A grid of images." },
  { key: "TIMELINE", label: "Timeline", description: "Steps, milestones or a curriculum outline." },
  { key: "LOGO_CLOUD", label: "Logo cloud", description: "Hiring partners or accreditations." },
  { key: "FAQ", label: "FAQ", description: "Questions from a chosen group." },
  { key: "BLOG", label: "Blog", description: "Latest posts." },
  { key: "EVENTS", label: "Events", description: "Upcoming events and open days." },
  { key: "CTA", label: "Call to action", description: "A closing banner with buttons." },
] as const;

export type SectionType = (typeof SECTION_TYPES)[number]["key"];

export function defaultSectionData(type: string): Record<string, unknown> {
  switch (type) {
    case "HERO": return { eyebrow: "", headline: "Learn Today. Lead Tomorrow.", subheadline: "", primaryCta: { label: "Explore courses", href: "/courses" }, variant: "cinematic", show3d: true };
    case "FEATURES": return { title: "", items: [{ title: "", description: "" }, { title: "", description: "" }], layout: "grid" };
    case "COURSE_GRID": return { title: "Courses", mode: "featured", limit: 6, courseIds: [] };
    case "PROGRAM_GRID": return { title: "Programs", limit: 4 };
    case "LEARNING_PATHS": return { title: "Learning paths", limit: 3 };
    case "STATS": return { items: [{ value: "8,500+", label: "Students trained" }, { value: "92%", label: "Course completion" }] };
    case "TESTIMONIALS": return { title: "What our students say", limit: 6, featuredOnly: true };
    case "SUCCESS_STORIES": return { title: "Success stories", limit: 3 };
    case "INSTRUCTOR_GRID": return { title: "Meet your instructors", limit: 4, featuredOnly: true };
    case "TEXT": return { title: "", body: "", align: "start", narrow: true };
    case "IMAGE": return { mediaId: "", caption: "", full: false };
    case "VIDEO": return { url: "", title: "" };
    case "GALLERY": return { mediaIds: [], columns: 3 };
    case "TIMELINE": return { title: "", items: [{ title: "", description: "" }, { title: "", description: "" }] };
    case "LOGO_CLOUD": return { title: "Hiring partners", logos: [{ name: "" }] };
    case "FAQ": return { title: "Frequently asked questions", group: "general", limit: 8 };
    case "BLOG": return { title: "From the blog", limit: 3 };
    case "EVENTS": return { title: "Upcoming events", limit: 3 };
    case "CTA": return { title: "Ready to start?", primaryCta: { label: "Apply now", href: "/apply" }, variant: "gradient" };
    default: return {};
  }
}

type Data = Record<string, unknown>;
type Cta = { label: string; href: string };

export function SectionFields({ type, data, onChange, errors, categories, courses }: { type: string; data: Data; onChange: (d: Data) => void; errors: Record<string, string[]>; categories: Array<{ id: string; name: string }>; courses: Array<{ id: string; title: string }> }) {
  const set = (patch: Data) => onChange({ ...data, ...patch });
  const str = (k: string) => (data[k] as string | undefined) ?? "";
  const num = (k: string, fallback: number) => (typeof data[k] === "number" ? (data[k] as number) : fallback);
  const bool = (k: string, fallback = false) => (typeof data[k] === "boolean" ? (data[k] as boolean) : fallback);
  const cta = (k: string): Cta => ((data[k] as Cta | undefined) ?? { label: "", href: "" });
  const items = (data.items as Array<Record<string, string>> | undefined) ?? [];
  const setItems = (next: Array<Record<string, string>>) => set({ items: next });

  const CtaFields = ({ k, label, optional }: { k: string; label: string; optional?: boolean }) => (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label={`${label} text`} htmlFor={`${k}-label`} hint={optional ? "Leave blank to hide." : undefined}><Input id={`${k}-label`} value={cta(k).label} onChange={(e) => set({ [k]: { ...cta(k), label: e.target.value } })} /></Field>
      <Field label={`${label} link`} htmlFor={`${k}-href`}><Input id={`${k}-href`} value={cta(k).href} onChange={(e) => set({ [k]: { ...cta(k), href: e.target.value } })} placeholder="/courses" /></Field>
    </div>
  );
  const LimitField = () => <Field label="How many to show" htmlFor="sf-limit"><Input id="sf-limit" type="number" min={1} max={12} value={num("limit", 6)} onChange={(e) => set({ limit: Number(e.target.value) })} /></Field>;
  const HeadingFields = () => (
    <>
      <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
      <Field label="Subtitle" htmlFor="sf-sub"><Textarea id="sf-sub" rows={2} value={str("subtitle")} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
    </>
  );

  switch (type) {
    case "HERO":
      return (
        <>
          <Field label="Eyebrow" htmlFor="sf-eyebrow" hint="Small label above the headline."><Input id="sf-eyebrow" value={str("eyebrow")} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
          <Field label="Headline" htmlFor="sf-head" error={errors.headline} required><Input id="sf-head" value={str("headline")} onChange={(e) => set({ headline: e.target.value })} /></Field>
          <Field label="Second headline line" htmlFor="sf-head2"><Input id="sf-head2" value={str("headline2")} onChange={(e) => set({ headline2: e.target.value })} /></Field>
          <Field label="Subheadline" htmlFor="sf-subhead"><Textarea id="sf-subhead" rows={2} value={str("subheadline")} onChange={(e) => set({ subheadline: e.target.value })} /></Field>
          <CtaFields k="primaryCta" label="Primary button" />
          <CtaFields k="secondaryCta" label="Secondary button" optional />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Layout" htmlFor="sf-variant"><SimpleSelect value={str("variant") || "cinematic"} onValueChange={(v) => set({ variant: v })} options={[{ value: "cinematic", label: "Cinematic" }, { value: "minimal", label: "Minimal" }, { value: "split", label: "Split" }]} /></Field>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="sf-3d">Show the 3D scene</Label><Switch id="sf-3d" checked={bool("show3d", true)} onCheckedChange={(v) => set({ show3d: v })} /></div>
          </div>
        </>
      );
    case "TEXT":
      return (
        <>
          <Field label="Eyebrow" htmlFor="sf-eyebrow"><Input id="sf-eyebrow" value={str("eyebrow")} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Body" htmlFor="sf-body" error={errors.body}><RichTextEditor value={str("body")} onChange={(v) => set({ body: v })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Alignment" htmlFor="sf-align"><SimpleSelect value={str("align") || "start"} onValueChange={(v) => set({ align: v })} options={[{ value: "start", label: "Left" }, { value: "center", label: "Centre" }]} /></Field>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="sf-narrow">Narrow column</Label><Switch id="sf-narrow" checked={bool("narrow", true)} onCheckedChange={(v) => set({ narrow: v })} /></div>
          </div>
        </>
      );
    case "IMAGE":
      return (
        <>
          <Field label="Media id" htmlFor="sf-media" error={errors.mediaId} hint="Copy the id from the media library." required><Input id="sf-media" value={str("mediaId")} onChange={(e) => set({ mediaId: e.target.value })} /></Field>
          <Field label="Caption" htmlFor="sf-caption"><Input id="sf-caption" value={str("caption")} onChange={(e) => set({ caption: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="sf-full">Full width</Label><Switch id="sf-full" checked={bool("full")} onCheckedChange={(v) => set({ full: v })} /></div>
        </>
      );
    case "VIDEO":
      return (
        <>
          <Field label="Video URL" htmlFor="sf-url" error={errors.url} hint="YouTube, Vimeo or a direct file."><Input id="sf-url" value={str("url")} onChange={(e) => set({ url: e.target.value })} /></Field>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Caption" htmlFor="sf-caption"><Input id="sf-caption" value={str("caption")} onChange={(e) => set({ caption: e.target.value })} /></Field>
        </>
      );
    case "COURSE_GRID":
      return (
        <>
          <HeadingFields />
          <Field label="Source" htmlFor="sf-mode"><SimpleSelect value={str("mode") || "featured"} onValueChange={(v) => set({ mode: v })} options={[{ value: "featured", label: "Featured courses" }, { value: "latest", label: "Latest courses" }, { value: "category", label: "From a category" }, { value: "manual", label: "Hand-picked" }]} /></Field>
          {str("mode") === "category" ? <Field label="Category" htmlFor="sf-cat"><SimpleSelect value={(data.categoryId as string) || "none"} onValueChange={(v) => set({ categoryId: v === "none" ? null : v })} options={[{ value: "none", label: "Choose a category" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} /></Field> : null}
          {str("mode") === "manual" ? (
            <div>
              <Label className="mb-2 block">Courses</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {courses.map((c) => {
                  const ids = (data.courseIds as string[] | undefined) ?? [];
                  return <label key={c.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-bg-subtle"><input type="checkbox" checked={ids.includes(c.id)} onChange={(e) => set({ courseIds: e.target.checked ? [...ids, c.id] : ids.filter((x) => x !== c.id) })} />{c.title}</label>;
                })}
              </div>
            </div>
          ) : <LimitField />}
          <Field label="Button text" htmlFor="sf-cta"><Input id="sf-cta" value={str("ctaLabel")} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="See all courses" /></Field>
        </>
      );
    case "PROGRAM_GRID":
    case "LEARNING_PATHS":
    case "BLOG":
    case "EVENTS":
    case "SUCCESS_STORIES":
      return (
        <>
          <HeadingFields />
          <LimitField />
        </>
      );
    case "INSTRUCTOR_GRID":
    case "TESTIMONIALS":
      return (
        <>
          <HeadingFields />
          <LimitField />
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="sf-feat">Featured only</Label><Switch id="sf-feat" checked={bool("featuredOnly", true)} onCheckedChange={(v) => set({ featuredOnly: v })} /></div>
        </>
      );
    case "FAQ":
      return (
        <>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="FAQ group" htmlFor="sf-group" hint="Matches the group on each FAQ entry."><Input id="sf-group" value={str("group") || "general"} onChange={(e) => set({ group: e.target.value })} /></Field>
          <LimitField />
        </>
      );
    case "STATS":
      return (
        <>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <ItemList items={items} onChange={setItems} fields={[{ key: "value", label: "Value", placeholder: "8,500+" }, { key: "label", label: "Label", placeholder: "Students trained" }, { key: "hint", label: "Hint", placeholder: "since 2019" }]} addLabel="Add stat" min={1} />
        </>
      );
    case "FEATURES":
      return (
        <>
          <Field label="Eyebrow" htmlFor="sf-eyebrow"><Input id="sf-eyebrow" value={str("eyebrow")} onChange={(e) => set({ eyebrow: e.target.value })} /></Field>
          <HeadingFields />
          <Field label="Layout" htmlFor="sf-layout"><SimpleSelect value={str("layout") || "grid"} onValueChange={(v) => set({ layout: v })} options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }, { value: "bento", label: "Bento" }]} /></Field>
          <ItemList items={items} onChange={setItems} fields={[{ key: "icon", label: "Icon", placeholder: "Sparkles" }, { key: "title", label: "Title" }, { key: "description", label: "Description", textarea: true }]} addLabel="Add feature" min={2} />
        </>
      );
    case "TIMELINE":
      return (
        <>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <ItemList items={items} onChange={setItems} fields={[{ key: "meta", label: "Meta", placeholder: "Week 1" }, { key: "title", label: "Title" }, { key: "description", label: "Description", textarea: true }]} addLabel="Add step" min={2} />
        </>
      );
    case "LOGO_CLOUD": {
      const logos = (data.logos as Array<Record<string, string>> | undefined) ?? [];
      return (
        <>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <ItemList items={logos} onChange={(next) => set({ logos: next })} fields={[{ key: "name", label: "Name" }, { key: "mediaId", label: "Media id", placeholder: "Optional" }, { key: "href", label: "Link", placeholder: "Optional" }]} addLabel="Add logo" min={1} />
        </>
      );
    }
    case "GALLERY": {
      const ids = ((data.mediaIds as string[] | undefined) ?? []).join(", ");
      return (
        <>
          <Field label="Title" htmlFor="sf-title"><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Media ids" htmlFor="sf-ids" error={errors.mediaIds} hint="Comma separated, from the media library."><Textarea id="sf-ids" rows={3} value={ids} onChange={(e) => set({ mediaIds: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
          <Field label="Columns" htmlFor="sf-cols"><Input id="sf-cols" type="number" min={2} max={4} value={num("columns", 3)} onChange={(e) => set({ columns: Number(e.target.value) })} /></Field>
        </>
      );
    }
    case "CTA":
      return (
        <>
          <Field label="Title" htmlFor="sf-title" error={errors.title} required><Input id="sf-title" value={str("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
          <Field label="Subtitle" htmlFor="sf-sub"><Textarea id="sf-sub" rows={2} value={str("subtitle")} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
          <CtaFields k="primaryCta" label="Primary button" />
          <CtaFields k="secondaryCta" label="Secondary button" optional />
          <Field label="Style" htmlFor="sf-variant"><SimpleSelect value={str("variant") || "gradient"} onValueChange={(v) => set({ variant: v })} options={[{ value: "gradient", label: "Gradient" }, { value: "dark", label: "Dark" }, { value: "light", label: "Light" }]} /></Field>
        </>
      );
    default:
      return <p className="text-caption text-fg-muted">This section type has no editable fields.</p>;
  }
}

function ItemList({ items, onChange, fields, addLabel, min }: { items: Array<Record<string, string>>; onChange: (next: Array<Record<string, string>>) => void; fields: Array<{ key: string; label: string; placeholder?: string; textarea?: boolean }>; addLabel: string; min: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between"><Label>Items</Label><Button type="button" size="sm" variant="ghost" onClick={() => onChange([...items, Object.fromEntries(fields.map((f) => [f.key, ""]))])}><Plus /> {addLabel}</Button></div>
      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between"><span className="text-caption text-fg-subtle">Item {i + 1}</span><Button type="button" size="sm" variant="ghost" aria-label="Remove item" disabled={items.length <= min} onClick={() => onChange(items.filter((_, ix) => ix !== i))}><Trash2 /></Button></div>
            {fields.map((f) => (
              <label key={f.key} className="grid gap-1 text-caption text-fg-muted">
                {f.label}
                {f.textarea ? <Textarea rows={2} value={item[f.key] ?? ""} onChange={(e) => onChange(items.map((x, ix) => (ix === i ? { ...x, [f.key]: e.target.value } : x)))} placeholder={f.placeholder} /> : <Input value={item[f.key] ?? ""} onChange={(e) => onChange(items.map((x, ix) => (ix === i ? { ...x, [f.key]: e.target.value } : x)))} placeholder={f.placeholder} />}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
