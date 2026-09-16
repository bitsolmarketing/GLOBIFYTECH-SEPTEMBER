"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Save } from "lucide-react";
import { saveSettingsAction, saveCampusAction, saveClassroomAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

type Kind = "string" | "number" | "boolean";
interface Group { group: string; label: string; description: string; keys: Array<{ key: string; value: unknown; kind: Kind }> }

const LABELS: Record<string, string> = {
  "institute.name": "Institute name",
  "institute.currency": "Currency (ISO code)",
  "institute.timezone": "Timezone",
  "institute.supportEmail": "Support email",
  "institute.whatsapp": "WhatsApp number",
  "attendance.warningPercent": "Warning below (%)",
  "attendance.criticalPercent": "Critical below (%)",
  "completion.defaultMinQuizPercent": "Default minimum quiz score (%)",
  "completion.autoIssueCertificate": "Issue certificates automatically on completion",
  "certificates.signatoryName": "Signatory name",
  "certificates.prefix": "Certificate number prefix",
  "finance.invoiceDueDays": "Invoice due after (days)",
  "finance.reminderDaysBefore": "Send reminders before due (days)",
  "risk.inactiveDaysHigh": "Inactive days for HIGH risk",
  "risk.inactiveDaysMedium": "Inactive days for MEDIUM risk",
  "gamification.enabled": "Enable points, badges and streaks",
  "community.requireApproval": "Discussions need approval before showing",
  "seo.defaultOgImage": "Default social image URL",
  "ai.tutorEnabled": "Student AI tutor",
  "ai.courseBuilderEnabled": "AI course builder",
  "ai.adminAssistantEnabled": "Admin assistant",
  "features.applyOnline": "Online applications",
  "features.jobsBoard": "Jobs & internships board",
  "features.portfolio": "Student portfolios",
};

export function SettingsForm({ groups }: { groups: Group[] }) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, unknown>>(() => Object.fromEntries(groups.flatMap((g) => g.keys.map((k) => [k.key, k.value]))));
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [pending, start] = React.useTransition();
  const set = (key: string, v: unknown) => { setValues((s) => ({ ...s, [key]: v })); setDirty((d) => new Set(d).add(key)); };
  const save = () =>
    start(async () => {
      const patch = Object.fromEntries([...dirty].map((k) => [k, values[k]]));
      const res = await saveSettingsAction(patch);
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success("Settings saved.");
      setDirty(new Set());
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => (
        <section key={g.group} className="surface p-5">
          <div className="mb-4"><p className="text-h4">{g.label}</p><p className="text-caption text-fg-muted">{g.description}</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.keys.map((k) => {
              const label = LABELS[k.key] ?? k.key;
              if (k.kind === "boolean") return <div key={k.key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 sm:col-span-2"><Label htmlFor={k.key}>{label}</Label><Switch id={k.key} checked={!!values[k.key]} onCheckedChange={(v) => set(k.key, v)} /></div>;
              if (k.kind === "number") return <Field key={k.key} label={label} htmlFor={k.key}><Input id={k.key} type="number" value={String(values[k.key] ?? "")} onChange={(e) => set(k.key, Number(e.target.value))} /></Field>;
              return <Field key={k.key} label={label} htmlFor={k.key}><Input id={k.key} value={String(values[k.key] ?? "")} onChange={(e) => set(k.key, e.target.value)} /></Field>;
            })}
          </div>
        </section>
      ))}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={save} loading={pending} disabled={!dirty.size} className="shadow-lg"><Save /> Save {dirty.size ? `${dirty.size} change${dirty.size > 1 ? "s" : ""}` : "settings"}</Button>
      </div>
    </div>
  );
}

interface CampusRow { id: string; code: string; name: string; city: string; country: string; address: string; phone: string; email: string; timezone: string; isActive: boolean; students: number; batches: number; classrooms: Array<{ id: string; name: string; capacity: number; floor: string; equipment: string[] }> }

export function CampusManager({ campuses }: { campuses: CampusRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Partial<CampusRow> | null>(null);
  const [room, setRoom] = React.useState<{ campusId: string; id?: string; name: string; capacity: number; floor: string; equipment: string } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <section className="surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <div><p className="text-h4">Campuses & classrooms</p><p className="text-caption text-fg-muted">Multi-campus ready. Batches, students and staff can be scoped to a campus.</p></div>
        <Button size="sm" variant="secondary" onClick={() => setEditing({ code: "", name: "", city: "Faisalabad", country: "PK", timezone: "Asia/Karachi", isActive: true, address: "", phone: "", email: "" })}><Plus /> Add campus</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {campuses.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div><p className="font-semibold"><Building2 className="me-1 inline size-4 text-accent" />{c.name} <span className="text-caption text-fg-subtle">{c.code}</span></p><p className="text-caption text-fg-muted">{c.city}, {c.country} · {c.students} students · {c.batches} batches</p></div>
              <div className="flex gap-1">{!c.isActive ? <Badge>Inactive</Badge> : null}<Button size="sm" variant="ghost" onClick={() => setEditing(c)}>Edit</Button></div>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {c.classrooms.map((r) => <li key={r.id}><button type="button" className="rounded-md border border-border px-2 py-1 text-caption hover:bg-bg-subtle" onClick={() => setRoom({ campusId: c.id, id: r.id, name: r.name, capacity: r.capacity, floor: r.floor, equipment: r.equipment.join(", ") })}>{r.name} · {r.capacity} seats</button></li>)}
              <li><button type="button" className="rounded-md border border-dashed border-border px-2 py-1 text-caption text-fg-muted hover:bg-bg-subtle" onClick={() => setRoom({ campusId: c.id, name: "", capacity: 18, floor: "", equipment: "" })}>+ Classroom</button></li>
            </ul>
          </div>
        ))}
        {!campuses.length ? <p className="text-caption text-fg-muted">No campus yet. Add your first campus to enable batches and attendance.</p> : null}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit campus" : "New campus"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Code" htmlFor="c-code" error={errors.code}><Input id="c-code" value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="FSD" /></Field>
              <Field label="Name" htmlFor="c-name" error={errors.name}><Input id="c-name" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="City" htmlFor="c-city" error={errors.city}><Input id="c-city" value={editing.city ?? ""} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
              <Field label="Country (ISO-2)" htmlFor="c-country" error={errors.country}><Input id="c-country" value={editing.country ?? ""} maxLength={2} onChange={(e) => setEditing({ ...editing, country: e.target.value.toUpperCase() })} /></Field>
              <Field label="Address" htmlFor="c-address" className="sm:col-span-2"><Input id="c-address" value={editing.address ?? ""} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></Field>
              <Field label="Phone" htmlFor="c-phone"><Input id="c-phone" value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></Field>
              <Field label="Email" htmlFor="c-email" error={errors.email}><Input id="c-email" type="email" value={editing.email ?? ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></Field>
              <Field label="Timezone" htmlFor="c-tz"><Input id="c-tz" value={editing.timezone ?? ""} onChange={(e) => setEditing({ ...editing, timezone: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="c-active">Active</Label><Switch id="c-active" checked={editing.isActive ?? true} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveCampusAction({ code: editing.code ?? "", name: editing.name ?? "", city: editing.city ?? "", country: editing.country ?? "PK", address: editing.address ?? "", phone: editing.phone ?? "", email: editing.email ?? "", timezone: editing.timezone ?? "Asia/Karachi", isActive: editing.isActive ?? true }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Campus saved."); setEditing(null); router.refresh(); })}>Save campus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!room} onOpenChange={(o) => !o && setRoom(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{room?.id ? "Edit classroom" : "New classroom"}</DialogTitle></DialogHeader>
          {room ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Name" htmlFor="r-name" error={errors.name}><Input id="r-name" value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} placeholder="Lab 1" /></Field>
              <Field label="Capacity" htmlFor="r-cap" error={errors.capacity}><Input id="r-cap" type="number" min={1} value={room.capacity} onChange={(e) => setRoom({ ...room, capacity: Number(e.target.value) })} /></Field>
              <Field label="Floor" htmlFor="r-floor"><Input id="r-floor" value={room.floor} onChange={(e) => setRoom({ ...room, floor: e.target.value })} /></Field>
              <Field label="Equipment (comma separated)" htmlFor="r-eq"><Input id="r-eq" value={room.equipment} onChange={(e) => setRoom({ ...room, equipment: e.target.value })} placeholder="Projector, 18 PCs" /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRoom(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { if (!room) return; setErrors({}); const res = await saveClassroomAction({ campusId: room.campusId, name: room.name, capacity: room.capacity, floor: room.floor, equipment: room.equipment.split(",").map((s) => s.trim()).filter(Boolean) }, room.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Classroom saved."); setRoom(null); router.refresh(); })}>Save classroom</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
