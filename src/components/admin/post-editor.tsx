"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, X, ExternalLink } from "lucide-react";
import { savePostAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { toast } from "@/components/ui/toaster";
import { slugify, enumLabel } from "@/lib/utils";

export interface PostValues { title: string; slug: string; excerpt: string; content: string; categoryId: string; tagNames: string[]; status: string; scheduledAt: string; seoTitle: string; seoDescription: string; canonicalUrl: string; noindex: boolean }

const STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

export function PostEditor({ id, initial, categories, canPublish }: { id?: string; initial?: Partial<PostValues>; categories: Array<{ id: string; name: string }>; canPublish: boolean }) {
  const router = useRouter();
  const [form, setForm] = React.useState<PostValues>({ title: "", slug: "", excerpt: "", content: "", categoryId: "", tagNames: [], status: "DRAFT", scheduledAt: "", seoTitle: "", seoDescription: "", canonicalUrl: "", noindex: false, ...initial });
  const [tag, setTag] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const save = (status?: string) =>
    start(async () => {
      setErrors({});
      const next = status ? { ...form, status } : form;
      const res = await savePostAction({ id, title: next.title, slug: next.slug || undefined, excerpt: next.excerpt, content: next.content, categoryId: next.categoryId || null, tagNames: next.tagNames, status: next.status as "DRAFT", scheduledAt: next.scheduledAt ? new Date(next.scheduledAt) : null, seoTitle: next.seoTitle, seoDescription: next.seoDescription, canonicalUrl: next.canonicalUrl, noindex: next.noindex });
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      setForm(next);
      toast.success(status === "PUBLISHED" ? "Post published." : "Post saved.");
      if (!id) router.push(`/admin/blog/${res.data.id}`);
      router.refresh();
    });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="surface flex flex-col gap-4 p-6">
        <Field label="Title" htmlFor="po-title" error={errors.title} required><Input id="po-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: id ? form.slug : slugify(e.target.value) })} /></Field>
        <Field label="Slug" htmlFor="po-slug" error={errors.slug} hint={`/blog/${form.slug || "…"}`}><Input id="po-slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></Field>
        <Field label="Excerpt" htmlFor="po-excerpt" error={errors.excerpt} hint="Shown on cards and in search results."><Textarea id="po-excerpt" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></Field>
        <Field label="Content" htmlFor="po-content" error={errors.content}><RichTextEditor value={form.content} onChange={(v) => setForm({ ...form, content: v })} /></Field>
      </div>
      <aside className="flex flex-col gap-4">
        <div className="surface flex flex-col gap-3 p-5">
          <p className="text-h4">Publishing</p>
          <Field label="Status" htmlFor="po-status"><SimpleSelect value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} options={STATUSES.filter((s) => canPublish || s === "DRAFT" || s === "IN_REVIEW").map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
          {form.status === "SCHEDULED" ? <Field label="Publish at" htmlFor="po-sched"><Input id="po-sched" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field> : null}
          <Button loading={pending} onClick={() => save()}><Save /> Save post</Button>
          {canPublish && form.status !== "PUBLISHED" ? <Button variant="secondary" loading={pending} onClick={() => save("PUBLISHED")}>Publish now</Button> : null}
          {id && form.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/blog/${form.slug}`} target="_blank"><ExternalLink /> View live</Link></Button> : null}
          {!canPublish ? <p className="text-caption text-fg-muted">You can save drafts and send for review. Publishing needs the publish permission.</p> : null}
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <p className="text-h4">Organisation</p>
          <Field label="Category" htmlFor="po-cat"><SimpleSelect value={form.categoryId || "none"} onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? "" : v })} options={[{ value: "none", label: "Uncategorised" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} /></Field>
          <div className="flex flex-col gap-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1">{form.tagNames.map((t) => <Badge key={t} variant="accent">{t}<button type="button" aria-label={`Remove ${t}`} onClick={() => setForm({ ...form, tagNames: form.tagNames.filter((x) => x !== t) })}><X className="size-3" /></button></Badge>)}</div>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tag.trim()) { e.preventDefault(); setForm({ ...form, tagNames: [...new Set([...form.tagNames, tag.trim()])] }); setTag(""); } }} placeholder="Add a tag and press Enter" />
          </div>
        </div>
        <div className="surface flex flex-col gap-3 p-5">
          <p className="text-h4">SEO</p>
          <Field label="SEO title" htmlFor="po-seo"><Input id="po-seo" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></Field>
          <Field label="SEO description" htmlFor="po-seod"><Textarea id="po-seod" rows={3} value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></Field>
          <Field label="Canonical URL" htmlFor="po-canon" error={errors.canonicalUrl}><Input id="po-canon" value={form.canonicalUrl} onChange={(e) => setForm({ ...form, canonicalUrl: e.target.value })} /></Field>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="po-noindex">Hide from search engines</Label><Switch id="po-noindex" checked={form.noindex} onCheckedChange={(v) => setForm({ ...form, noindex: v })} /></div>
        </div>
      </aside>
    </div>
  );
}
