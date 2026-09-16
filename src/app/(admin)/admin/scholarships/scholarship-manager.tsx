"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, GraduationCap, UserPlus } from "lucide-react";
import { saveScholarshipAction, awardScholarshipAction, searchStudentsAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { formatDate, formatMoney } from "@/lib/utils";

interface Award { id: string; studentId: string; studentName: string; studentNumber: string; awardedAt: string; note: string; invoices: number }
export interface Scholarship { id: string; name: string; description: string; type: "PERCENT" | "FIXED"; value: number; seats: number | null; criteria: string; isActive: boolean; awards: Award[] }

const EMPTY = { name: "", description: "", type: "PERCENT" as "PERCENT" | "FIXED", value: 50, seats: null as number | null, criteria: "", isActive: true };

export function ScholarshipManager({ scholarships }: { scholarships: Scholarship[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [awarding, setAwarding] = React.useState<Scholarship | null>(null);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Array<{ id: string; label: string }>>([]);
  const [picked, setPicked] = React.useState<{ id: string; label: string } | null>(null);
  const [note, setNote] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = (value: string) => { setQ(value); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(async () => { const res = await searchStudentsAction(value); if (res.ok) setResults(res.data); }, 300); };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing({ ...EMPTY })}><Plus /> New scholarship</Button></div>
      {scholarships.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {scholarships.map((s) => (
            <section key={s.id} className="surface flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <div><p className="text-h4">{s.name}</p><p className="text-caption text-fg-muted">{s.type === "PERCENT" ? `${s.value}% off` : `${formatMoney(s.value)} off`}{s.seats ? ` · ${s.awards.length}/${s.seats} seats` : ` · ${s.awards.length} awarded`}</p></div>
                <div className="flex items-center gap-1">{s.isActive ? <Badge variant="success">Active</Badge> : <Badge>Inactive</Badge>}<Button variant="ghost" size="sm" onClick={() => setEditing({ id: s.id, name: s.name, description: s.description, type: s.type, value: s.value, seats: s.seats, criteria: s.criteria, isActive: s.isActive })}>Edit</Button></div>
              </div>
              {s.description ? <p className="text-body-sm text-fg-muted">{s.description}</p> : null}
              {s.criteria ? <p className="rounded-md bg-bg-muted p-3 text-caption text-fg-muted"><span className="font-medium">Criteria:</span> {s.criteria}</p> : null}
              <div>
                <p className="text-label mb-1 text-fg-subtle">Awards</p>
                {s.awards.length ? (
                  <ul className="divide-y divide-border">{s.awards.map((a) => <li key={a.id} className="flex items-center justify-between py-1.5 text-sm"><span><Link href={`/admin/students/${a.studentId}`} className="font-medium hover:text-accent">{a.studentName}</Link><span className="block text-caption text-fg-subtle">{a.studentNumber} · {formatDate(new Date(a.awardedAt))}{a.note ? ` · ${a.note}` : ""}</span></span>{a.invoices ? <Badge>{a.invoices} invoice{a.invoices > 1 ? "s" : ""}</Badge> : null}</li>)}</ul>
                ) : <p className="text-caption text-fg-subtle">Not awarded yet.</p>}
              </div>
              <Button size="sm" variant="secondary" className="w-fit" disabled={!!s.seats && s.awards.length >= s.seats} onClick={() => { setAwarding(s); setPicked(null); setQ(""); setResults([]); setNote(""); }}><UserPlus /> Award to a student</Button>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState icon={<GraduationCap />} title="No scholarships yet." description="Set up a merit or need-based award so finance can apply it when invoicing." action={<Button size="sm" onClick={() => setEditing({ ...EMPTY })}>Create a scholarship</Button>} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit scholarship" : "New scholarship"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="s-name" error={errors.name} required className="sm:col-span-2"><Input id="s-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Merit scholarship 2026" /></Field>
              <Field label="Type" htmlFor="s-type"><SimpleSelect value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as "PERCENT" | "FIXED" })} options={[{ value: "PERCENT", label: "Percentage" }, { value: "FIXED", label: "Fixed amount" }]} /></Field>
              <Field label={editing.type === "PERCENT" ? "Percent off" : "Amount off"} htmlFor="s-value" error={errors.value} required><Input id="s-value" type="number" min={0} step="0.01" value={editing.value} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} /></Field>
              <Field label="Seats" htmlFor="s-seats" hint="Blank means unlimited."><Input id="s-seats" type="number" min={1} value={editing.seats ?? ""} onChange={(e) => setEditing({ ...editing, seats: e.target.value ? Number(e.target.value) : null })} /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="s-active">Active</Label><Switch id="s-active" checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} /></div>
              <Field label="Description" htmlFor="s-desc" className="sm:col-span-2"><Textarea id="s-desc" rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <Field label="Criteria" htmlFor="s-criteria" className="sm:col-span-2" hint="Shown to the admissions team when awarding."><Textarea id="s-criteria" rows={2} value={editing.criteria} onChange={(e) => setEditing({ ...editing, criteria: e.target.value })} /></Field>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveScholarshipAction({ name: editing.name, description: editing.description, type: editing.type, value: editing.value, seats: editing.seats, criteria: editing.criteria, isActive: editing.isActive }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Scholarship saved."); setEditing(null); router.refresh(); })}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!awarding} onOpenChange={(o) => !o && setAwarding(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Award {awarding?.name}</DialogTitle><DialogDescription>The award is applied the next time an invoice is raised for this student.</DialogDescription></DialogHeader>
          <div className="grid gap-3">
            {picked ? <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">{picked.label}<Button variant="ghost" size="sm" onClick={() => setPicked(null)}>Change</Button></div> : (
              <>
                <Input value={q} onChange={(e) => search(e.target.value)} placeholder="Search student by name, email or number" autoFocus />
                {q.length >= 2 ? <ul className="max-h-48 overflow-y-auto rounded-md border border-border">{results.map((r) => <li key={r.id}><button type="button" className="w-full px-3 py-2 text-start text-sm hover:bg-bg-subtle" onClick={() => setPicked(r)}>{r.label}</button></li>)}{!results.length ? <li className="px-3 py-2 text-caption text-fg-muted">No students found.</li> : null}</ul> : null}
              </>
            )}
            <Field label="Note" htmlFor="a-note"><Input id="a-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Approved by the scholarship committee" /></Field>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAwarding(null)}>Cancel</Button><Button loading={pending} disabled={!picked} onClick={() => start(async () => { if (!awarding || !picked) return; const res = await awardScholarshipAction({ scholarshipId: awarding.id, studentId: picked.id, note }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Scholarship awarded."); setAwarding(null); router.refresh(); })}>Award</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
