"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Copy, Eye, EyeOff, ArrowUp, ArrowDown, Save, Globe, Undo2 } from "lucide-react";
import { savePageAction, saveSectionAction, deleteSectionAction, duplicateSectionAction, reorderSectionsAction, setPageStatusAction } from "@/server/actions/admin";
import { SECTION_TYPES, defaultSectionData, SectionFields, type SectionType } from "@/components/admin/section-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel } from "@/lib/utils";

export interface SectionState { id: string; type: string; name: string; data: Record<string, unknown>; isVisible: boolean; order: number }
interface PageState { id: string; title: string; slug: string; locale: string; status: string; seoTitle: string; seoDescription: string; canonicalUrl: string; noindex: boolean; scheduledAt: string }

export function PageBuilder({ page, sections, categories, courses, canPublish }: { page: PageState; sections: SectionState[]; categories: Array<{ id: string; name: string }>; courses: Array<{ id: string; title: string }>; canPublish: boolean }) {
  const router = useRouter();
  const [meta, setMeta] = React.useState(page);
  const [editing, setEditing] = React.useState<SectionState | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [newType, setNewType] = React.useState<SectionType>(SECTION_TYPES[0]!.key);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();

  const saveMeta = () =>
    start(async () => {
      setErrors({});
      const res = await savePageAction({ id: meta.id, title: meta.title, slug: meta.slug, locale: meta.locale, seoTitle: meta.seoTitle, seoDescription: meta.seoDescription, canonicalUrl: meta.canonicalUrl, noindex: meta.noindex });
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Page settings saved.");
      router.refresh();
    });

  const saveSection = (section: SectionState) =>
    start(async () => {
      setErrors({});
      const res = await saveSectionAction({ id: section.id || undefined, pageId: page.id, type: section.type as "HERO", name: section.name, data: section.data, isVisible: section.isVisible, order: section.order });
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success("Section saved.");
      setEditing(null);
      setAdding(false);
      router.refresh();
    });

  const move = (index: number, dir: -1 | 1) =>
    start(async () => {
      const next = [...sections];
      const target = index + dir;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target]!, next[index]!];
      const res = await reorderSectionsAction(page.id, next.map((s) => s.id));
      if (!res.ok) { toast.error(res.error.message); return; }
      router.refresh();
    });

  const publish = (action: "publish" | "unpublish" | "schedule" | "archive") =>
    start(async () => {
      const res = await setPageStatusAction({ id: page.id, action, scheduledAt: action === "schedule" && meta.scheduledAt ? new Date(meta.scheduledAt) : null });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(action === "publish" ? "Page published." : action === "unpublish" ? "Page unpublished." : action === "schedule" ? "Page scheduled." : "Page archived.");
      router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between"><p className="text-h4">Sections</p><Button size="sm" onClick={() => { setNewType(SECTION_TYPES[0]!.key); setAdding(true); }}><Plus /> Add section</Button></div>
        {sections.length ? (
          <ol className="flex flex-col gap-2">
            {sections.map((s, i) => {
              const def = SECTION_TYPES.find((t) => t.key === s.type);
              return (
                <li key={s.id} className={cn("surface flex items-center gap-3 p-4", !s.isVisible && "opacity-60")}>
                  <span className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="sm" aria-label="Move up" disabled={i === 0 || pending} onClick={() => move(i, -1)}><ArrowUp /></Button>
                    <Button variant="ghost" size="sm" aria-label="Move down" disabled={i === sections.length - 1 || pending} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="font-medium">{s.name || def?.label || enumLabel(s.type)}</span><Badge>{def?.label ?? enumLabel(s.type)}</Badge>{!s.isVisible ? <Badge variant="warning">Hidden</Badge> : null}</span>
                    <span className="block truncate text-caption text-fg-muted">{summarise(s)}</span>
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>Edit</Button>
                    <Button variant="ghost" size="sm" aria-label={s.isVisible ? "Hide" : "Show"} loading={pending} onClick={() => saveSection({ ...s, isVisible: !s.isVisible })}>{s.isVisible ? <EyeOff /> : <Eye />}</Button>
                    <Button variant="ghost" size="sm" aria-label="Duplicate" loading={pending} onClick={() => start(async () => { const res = await duplicateSectionAction(s.id, page.id); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Section duplicated."); router.refresh(); })}><Copy /></Button>
                    <Button variant="ghost" size="sm" aria-label="Delete" loading={pending} onClick={() => start(async () => { const res = await deleteSectionAction(s.id, page.id); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Section removed."); router.refresh(); })}><Trash2 /></Button>
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="surface p-8 text-center"><p className="text-body-sm text-fg-muted">This page has no sections yet.</p><Button size="sm" className="mt-3" onClick={() => setAdding(true)}><Plus /> Add the first section</Button></div>
        )}
      </div>

      <aside className="flex flex-col gap-4">
        <div className="surface flex flex-col gap-3 p-5">
          <p className="text-h4">Publishing</p>
          {canPublish ? (
            <>
              {page.status !== "PUBLISHED" ? <Button loading={pending} onClick={() => publish("publish")}><Globe /> Publish now</Button> : <Button variant="outline" loading={pending} onClick={() => publish("unpublish")}><Undo2 /> Unpublish</Button>}
              <div className="grid gap-1.5"><Label htmlFor="pg-sched">Schedule</Label><Input id="pg-sched" type="datetime-local" value={meta.scheduledAt} onChange={(e) => setMeta({ ...meta, scheduledAt: e.target.value })} /><Button variant="secondary" size="sm" disabled={!meta.scheduledAt} loading={pending} onClick={() => publish("schedule")}>Schedule publish</Button></div>
              <Button variant="ghost" size="sm" loading={pending} onClick={() => publish("archive")}>Archive page</Button>
            </>
          ) : <p className="text-caption text-fg-muted">You can edit this page. Publishing needs the publish permission.</p>}
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <p className="text-h4">Page settings</p>
          <Field label="Title" htmlFor="pg-title" error={errors.title}><Input id="pg-title" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} /></Field>
          <Field label="Slug" htmlFor="pg-slug" error={errors.slug}><Input id="pg-slug" value={meta.slug} onChange={(e) => setMeta({ ...meta, slug: e.target.value })} /></Field>
          <Field label="SEO title" htmlFor="pg-seo" hint="Up to 70 characters."><Input id="pg-seo" value={meta.seoTitle} onChange={(e) => setMeta({ ...meta, seoTitle: e.target.value })} /></Field>
          <Field label="SEO description" htmlFor="pg-seod" hint="Up to 160 characters."><Textarea id="pg-seod" rows={3} value={meta.seoDescription} onChange={(e) => setMeta({ ...meta, seoDescription: e.target.value })} /></Field>
          <Field label="Canonical URL" htmlFor="pg-canon" error={errors.canonicalUrl}><Input id="pg-canon" value={meta.canonicalUrl} onChange={(e) => setMeta({ ...meta, canonicalUrl: e.target.value })} placeholder="Optional" /></Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="pg-noindex">Hide from search engines</Label><Switch id="pg-noindex" checked={meta.noindex} onCheckedChange={(v) => setMeta({ ...meta, noindex: v })} /></div>
          <Button loading={pending} onClick={saveMeta}><Save /> Save settings</Button>
        </div>
      </aside>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add a section</DialogTitle><DialogDescription>Pick a block type. You can edit its content straight after.</DialogDescription></DialogHeader>
          <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
            {SECTION_TYPES.map((t) => (
              <button key={t.key} type="button" onClick={() => setNewType(t.key)} className={cn("rounded-lg border p-3 text-start", newType === t.key ? "border-accent bg-accent-soft" : "border-border hover:bg-bg-subtle")}>
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-caption text-fg-muted">{t.description}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button loading={pending} onClick={() => { setAdding(false); setEditing({ id: "", type: newType, name: "", data: defaultSectionData(newType), isVisible: true, order: sections.length }); }}>Configure</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit section" : "New section"}</DialogTitle><DialogDescription>{SECTION_TYPES.find((t) => t.key === editing?.type)?.description}</DialogDescription></DialogHeader>
          {editing ? (
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto pe-1">
              <Field label="Internal name" htmlFor="sec-name" hint="Only shown in this builder."><Input id="sec-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <SectionFields type={editing.type} data={editing.data} onChange={(data) => setEditing({ ...editing, data })} errors={errors} categories={categories} courses={courses} />
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={() => editing && saveSection(editing)}>Save section</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function summarise(s: SectionState) {
  const d = s.data as Record<string, unknown>;
  const first = (d.headline ?? d.title ?? d.eyebrow ?? d.subtitle) as string | undefined;
  if (first) return first;
  if (Array.isArray(d.items)) return `${d.items.length} items`;
  if (typeof d.limit === "number") return `Shows ${d.limit}`;
  return "No content set";
}
