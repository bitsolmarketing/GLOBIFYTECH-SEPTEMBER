"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { saveNavigationItemAction, deleteNavigationItemAction, reorderNavigationAction, saveFaqAction, deleteFaqAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

interface NavItem { id: string; label: string; href: string; description: string; order: number; openInNewTab: boolean; isVisible: boolean; parentId: string | null }
interface Nav { id: string; key: string; name: string; items: NavItem[] }

export function NavigationManager({ navigations }: { navigations: Nav[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<{ navigationId: string; id?: string; label: string; href: string; description: string; openInNewTab: boolean; isVisible: boolean; parentId: string; order: number } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const move = (nav: Nav, index: number, dir: -1 | 1) =>
    start(async () => {
      const ids = nav.items.map((i) => i.id);
      const target = index + dir;
      if (target < 0 || target >= ids.length) return;
      [ids[index], ids[target]] = [ids[target]!, ids[index]!];
      const res = await reorderNavigationAction(ids);
      if (!res.ok) { toast.error(res.error.message); return; }
      router.refresh();
    });
  return (
    <section className="flex flex-col gap-4">
      <p className="text-h4">Navigation</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {navigations.map((nav) => (
          <div key={nav.id} className="surface p-5">
            <div className="mb-3 flex items-center justify-between"><div><p className="font-semibold">{nav.name}</p><p className="text-caption text-fg-subtle">{nav.key}</p></div><Button size="sm" variant="ghost" onClick={() => setEditing({ navigationId: nav.id, label: "", href: "", description: "", openInNewTab: false, isVisible: true, parentId: "", order: nav.items.length })}><Plus /> Add link</Button></div>
            <ul className="flex flex-col divide-y divide-border">
              {nav.items.map((i, idx) => (
                <li key={i.id} className={cn("flex items-center gap-2 py-2 text-sm", !i.isVisible && "opacity-60", i.parentId && "ps-5")}>
                  <span className="flex flex-col"><Button variant="ghost" size="sm" aria-label="Move up" disabled={idx === 0 || pending} onClick={() => move(nav, idx, -1)}><ArrowUp /></Button><Button variant="ghost" size="sm" aria-label="Move down" disabled={idx === nav.items.length - 1 || pending} onClick={() => move(nav, idx, 1)}><ArrowDown /></Button></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{i.label}</span><span className="block truncate text-caption text-fg-subtle">{i.href}</span></span>
                  {!i.isVisible ? <Badge>Hidden</Badge> : null}
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ navigationId: nav.id, id: i.id, label: i.label, href: i.href, description: i.description, openInNewTab: i.openInNewTab, isVisible: i.isVisible, parentId: i.parentId ?? "", order: i.order })}>Edit</Button>
                  <ConfirmAction title={`Remove "${i.label}"?`} confirmLabel="Remove" variant="ghost" action={() => deleteNavigationItemAction(i.id)} successMessage="Link removed."><Trash2 /></ConfirmAction>
                </li>
              ))}
              {!nav.items.length ? <li className="py-2 text-caption text-fg-muted">No links yet. Defaults are used until you add some.</li> : null}
            </ul>
          </div>
        ))}
        {!navigations.length ? <p className="surface p-6 text-body-sm text-fg-muted">No navigation menus exist yet. The site falls back to its built-in defaults.</p> : null}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit link" : "New link"}</DialogTitle><DialogDescription>Links can point anywhere on the site or to an external URL.</DialogDescription></DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <Field label="Label" htmlFor="n-label" error={errors.label} required><Input id="n-label" value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></Field>
              <Field label="Link" htmlFor="n-href" error={errors.href} required><Input id="n-href" value={editing.href} onChange={(e) => setEditing({ ...editing, href: e.target.value })} placeholder="/courses" /></Field>
              <Field label="Description" htmlFor="n-desc" hint="Shown in mega menus."><Textarea id="n-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="n-blank">Open in a new tab</Label><Switch id="n-blank" checked={editing.openInNewTab} onCheckedChange={(v) => setEditing({ ...editing, openInNewTab: v })} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="n-vis">Visible</Label><Switch id="n-vis" checked={editing.isVisible} onCheckedChange={(v) => setEditing({ ...editing, isVisible: v })} /></div>
              </div>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveNavigationItemAction({ id: editing.id, navigationId: editing.navigationId, parentId: editing.parentId || null, label: editing.label, href: editing.href, description: editing.description, openInNewTab: editing.openInNewTab, isVisible: editing.isVisible, order: editing.order }); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Link saved."); setEditing(null); router.refresh(); })}>Save link</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface Faq { id: string; question: string; answer: string; group: string; order: number; isVisible: boolean }
const EMPTY_FAQ = { question: "", answer: "", group: "general", order: 0, isVisible: true };

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<(typeof EMPTY_FAQ & { id?: string }) | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const groups = [...new Set(faqs.map((f) => f.group))];
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><p className="text-h4">FAQs</p><Button size="sm" variant="ghost" onClick={() => setEditing({ ...EMPTY_FAQ, order: faqs.length })}><Plus /> Add question</Button></div>
      {groups.length ? (
        groups.map((g) => (
          <div key={g} className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">{g}</p>
            <ul className="flex flex-col divide-y divide-border">
              {faqs.filter((f) => f.group === g).map((f) => (
                <li key={f.id} className={cn("flex items-start justify-between gap-3 py-2 text-sm", !f.isVisible && "opacity-60")}>
                  <span className="min-w-0"><span className="block font-medium">{f.question}</span><span className="block line-clamp-2 text-caption text-fg-muted">{f.answer}</span></span>
                  <span className="flex shrink-0 gap-1"><Button variant="ghost" size="sm" onClick={() => setEditing({ id: f.id, question: f.question, answer: f.answer, group: f.group, order: f.order, isVisible: f.isVisible })}>Edit</Button><ConfirmAction title="Delete this question?" confirmLabel="Delete" variant="ghost" action={() => deleteFaqAction(f.id)} successMessage="FAQ deleted."><Trash2 /></ConfirmAction></span>
                </li>
              ))}
            </ul>
          </div>
        ))
      ) : (
        <div className="surface flex items-center gap-3 p-6 text-body-sm text-fg-muted"><HelpCircle className="size-5" />No FAQs yet. Add questions and drop a FAQ section on any page.</div>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <Field label="Question" htmlFor="f-q" error={errors.question} required><Input id="f-q" value={editing.question} onChange={(e) => setEditing({ ...editing, question: e.target.value })} /></Field>
              <Field label="Answer" htmlFor="f-a" error={errors.answer} required><Textarea id="f-a" rows={4} value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Group" htmlFor="f-g" hint="Sections pull questions by group."><Input id="f-g" value={editing.group} onChange={(e) => setEditing({ ...editing, group: e.target.value })} /></Field>
                <Field label="Order" htmlFor="f-o"><Input id="f-o" type="number" min={0} value={editing.order} onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })} /></Field>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="f-v">Visible</Label><Switch id="f-v" checked={editing.isVisible} onCheckedChange={(v) => setEditing({ ...editing, isVisible: v })} /></div>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveFaqAction({ question: editing.question, answer: editing.answer, group: editing.group, order: editing.order, isVisible: editing.isVisible }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("FAQ saved."); setEditing(null); router.refresh(); })}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
