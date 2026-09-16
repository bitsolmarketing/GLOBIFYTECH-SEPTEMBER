"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, CalendarDays, ExternalLink } from "lucide-react";
import { saveEventAction } from "@/server/actions/admin";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge, statusVariant } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { enumLabel, formatDateTime } from "@/lib/utils";

interface EventRow { id: string; title: string; slug: string; description: string; startsAt: string; endsAt: string; location: string; isOnline: boolean; meetingUrl: string; capacity: number | null; campusId: string | null; campusName: string | null; status: string; registrations: number }

const STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"] as const;
const EMPTY = { title: "", description: "", startsAt: "", endsAt: "", location: "", isOnline: false, meetingUrl: "", capacity: null as number | null, campusId: "", status: "DRAFT" as string };

export function EventManager({ events, campuses }: { events: EventRow[]; campuses: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing({ ...EMPTY, startsAt: new Date(Date.now() + 86400000).toISOString().slice(0, 16) })}><Plus /> New event</Button></div>
      {events.length ? (
        <AdminTable headers={["Event", "When", "Where", { label: "Registrations", align: "end" }, "Status", { label: "", align: "end" }]}>
          {events.map((e) => (
            <Row key={e.id}>
              <Cell className="font-medium">{e.title}<span className="block text-caption text-fg-subtle">/events/{e.slug}</span></Cell>
              <Cell className="text-caption text-fg-muted">{formatDateTime(new Date(e.startsAt))}{e.endsAt ? <span className="block">to {formatDateTime(new Date(e.endsAt))}</span> : null}</Cell>
              <Cell className="text-caption text-fg-muted">{e.isOnline ? "Online" : e.location || e.campusName || "—"}</Cell>
              <Cell align="end">{e.registrations}{e.capacity ? <span className="text-fg-subtle">/{e.capacity}</span> : null}</Cell>
              <Cell><Badge variant={statusVariant(e.status)}>{enumLabel(e.status)}</Badge></Cell>
              <Cell align="end"><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" onClick={() => setEditing({ id: e.id, title: e.title, description: e.description, startsAt: e.startsAt, endsAt: e.endsAt, location: e.location, isOnline: e.isOnline, meetingUrl: e.meetingUrl, capacity: e.capacity, campusId: e.campusId ?? "", status: e.status })}>Edit</Button>{e.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/events/${e.slug}`} target="_blank" aria-label="View"><ExternalLink /></Link></Button> : null}</div></Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<CalendarDays />} title="No events yet." description="Publish an open day or webinar to capture new leads." action={<Button size="sm" onClick={() => setEditing({ ...EMPTY })}>Create an event</Button>} />
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit event" : "New event"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto pe-1 sm:grid-cols-2">
              <Field label="Title" htmlFor="e-title" error={errors.title} required className="sm:col-span-2"><Input id="e-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Starts" htmlFor="e-start" error={errors.startsAt} required><Input id="e-start" type="datetime-local" value={editing.startsAt} onChange={(e) => setEditing({ ...editing, startsAt: e.target.value })} /></Field>
              <Field label="Ends" htmlFor="e-end"><Input id="e-end" type="datetime-local" value={editing.endsAt} onChange={(e) => setEditing({ ...editing, endsAt: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="e-online">Online event</Label><Switch id="e-online" checked={editing.isOnline} onCheckedChange={(v) => setEditing({ ...editing, isOnline: v })} /></div>
              <Field label="Capacity" htmlFor="e-cap" hint="Blank means unlimited."><Input id="e-cap" type="number" min={1} value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: e.target.value ? Number(e.target.value) : null })} /></Field>
              {editing.isOnline ? <Field label="Meeting URL" htmlFor="e-url" error={errors.meetingUrl} className="sm:col-span-2"><Input id="e-url" value={editing.meetingUrl} onChange={(e) => setEditing({ ...editing, meetingUrl: e.target.value })} /></Field> : <Field label="Location" htmlFor="e-loc" className="sm:col-span-2"><Input id="e-loc" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Globify Tech campus, Faisalabad" /></Field>}
              {campuses.length ? <Field label="Campus" htmlFor="e-campus"><SimpleSelect value={editing.campusId || "none"} onValueChange={(v) => setEditing({ ...editing, campusId: v === "none" ? "" : v })} options={[{ value: "none", label: "No campus" }, ...campuses.map((c) => ({ value: c.id, label: c.name }))]} /></Field> : null}
              <Field label="Status" htmlFor="e-status"><SimpleSelect value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })} options={STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
              <Field label="Description" htmlFor="e-desc" className="sm:col-span-2"><RichTextEditor value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} /></Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveEventAction({ title: editing.title, description: editing.description, startsAt: new Date(editing.startsAt), endsAt: editing.endsAt ? new Date(editing.endsAt) : null, location: editing.location, isOnline: editing.isOnline, meetingUrl: editing.meetingUrl, capacity: editing.capacity, coverMediaId: null, campusId: editing.campusId || null, status: editing.status as "DRAFT" }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Event saved."); setEditing(null); router.refresh(); })}>Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
