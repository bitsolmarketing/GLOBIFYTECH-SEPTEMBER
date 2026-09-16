"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderTree } from "lucide-react";
import { saveCategoryAction, deleteCategoryAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { enumLabel } from "@/lib/utils";

export interface CategoryRow { id: string; name: string; slug: string; description: string; artworkKey: string; order: number; parentId: string | null; parentName: string | null; isActive: boolean; courses: number; children: number }

const EMPTY = { name: "", description: "", artworkKey: "ai", order: 0, parentId: "" };

export function CategoryManager({ categories, artworkKeys }: { categories: CategoryRow[]; artworkKeys: string[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing({ ...EMPTY, order: categories.length })}><Plus /> New category</Button></div>
      {categories.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <article key={c.id} className="surface overflow-hidden">
              <div className="h-24"><CourseArtwork artworkKey={c.artworkKey} seed={c.slug} title={c.name} /></div>
              <div className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-body font-semibold">{c.name}</p><p className="text-caption text-fg-subtle">/{c.slug}{c.parentName ? ` · under ${c.parentName}` : ""}</p></div>
                  {c.isActive ? null : <Badge>Hidden</Badge>}
                </div>
                {c.description ? <p className="line-clamp-2 text-caption text-fg-muted">{c.description}</p> : null}
                <p className="text-caption text-fg-subtle">{c.courses} course{c.courses === 1 ? "" : "s"}{c.children ? ` · ${c.children} subcategories` : ""}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: c.id, name: c.name, description: c.description, artworkKey: c.artworkKey, order: c.order, parentId: c.parentId ?? "" })}>Edit</Button>
                  {c.isActive && !c.courses && !c.children ? <ConfirmAction title={`Hide ${c.name}?`} description="The category is deactivated and disappears from the public catalogue." confirmLabel="Hide" variant="ghost" action={() => deleteCategoryAction(c.id)} successMessage="Category hidden.">Hide</ConfirmAction> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<FolderTree />} title="No categories yet." description="Categories drive the marketplace filters and the generated course artwork." action={<Button size="sm" onClick={() => setEditing({ ...EMPTY })}>Create the first category</Button>} />
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle><DialogDescription>The artwork style is used wherever a course has no cover image.</DialogDescription></DialogHeader>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="c-name" error={errors.name} required className="sm:col-span-2"><Input id="c-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Artwork style" htmlFor="c-art"><SimpleSelect value={editing.artworkKey} onValueChange={(v) => setEditing({ ...editing, artworkKey: v })} options={artworkKeys.map((k) => ({ value: k, label: enumLabel(k) }))} /></Field>
              <Field label="Order" htmlFor="c-order"><Input id="c-order" type="number" min={0} value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
              <Field label="Parent category" htmlFor="c-parent" className="sm:col-span-2"><SimpleSelect value={editing.parentId || "none"} onValueChange={(v) => setEditing({ ...editing, parentId: v === "none" ? "" : v })} options={[{ value: "none", label: "Top level" }, ...categories.filter((c) => c.id !== editing.id).map((c) => ({ value: c.id, label: c.name }))]} /></Field>
              <Field label="Description" htmlFor="c-desc" className="sm:col-span-2"><Textarea id="c-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="sm:col-span-2 h-24 overflow-hidden rounded-lg"><CourseArtwork artworkKey={editing.artworkKey} seed={editing.name} title={editing.name || "Preview"} /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveCategoryAction({ name: editing.name, description: editing.description, artworkKey: editing.artworkKey, order: editing.order, parentId: editing.parentId || null }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Category saved."); setEditing(null); router.refresh(); })}>Save category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
