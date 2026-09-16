"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2, ExternalLink } from "lucide-react";
import { saveEmployerAction } from "@/server/actions/admin";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";

interface Employer { id: string; name: string; slug: string; website: string; industry: string; city: string; country: string; description: string; isVerified: boolean; isHiringPartner: boolean; jobs: number; internships: number; members: number; hires: number }

const EMPTY = { name: "", website: "", industry: "", city: "Faisalabad", country: "PK", description: "", isVerified: false, isHiringPartner: true };

export function EmployerManager({ employers }: { employers: Employer[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const partners = employers.filter((e) => e.isHiringPartner).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-caption text-fg-muted">{partners} hiring partner{partners === 1 ? "" : "s"} · {employers.reduce((s, e) => s + e.hires, 0)} graduates hired</p>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY })}><Plus /> New employer</Button>
      </div>
      {employers.length ? (
        <AdminTable headers={["Employer", "Industry", "Location", { label: "Jobs", align: "end" }, { label: "Internships", align: "end" }, { label: "Hires", align: "end" }, "Flags", { label: "", align: "end" }]}>
          {employers.map((e) => (
            <Row key={e.id}>
              <Cell><span className="font-medium">{e.name}</span>{e.website ? <a href={e.website} target="_blank" rel="noreferrer" className="block text-caption text-accent hover:underline">{e.website.replace(/^https?:\/\//, "")}<ExternalLink className="ms-1 inline size-3" /></a> : null}</Cell>
              <Cell muted>{e.industry || "—"}</Cell>
              <Cell muted>{[e.city, e.country].filter(Boolean).join(", ")}</Cell>
              <Cell align="end">{e.jobs}</Cell>
              <Cell align="end">{e.internships}</Cell>
              <Cell align="end">{e.hires}</Cell>
              <Cell><div className="flex gap-1">{e.isHiringPartner ? <Badge variant="accent">Partner</Badge> : null}{e.isVerified ? <Badge variant="success">Verified</Badge> : null}{e.members ? <Badge>{e.members} users</Badge> : null}</div></Cell>
              <Cell align="end"><Button variant="ghost" size="sm" onClick={() => setEditing({ id: e.id, name: e.name, website: e.website, industry: e.industry, city: e.city, country: e.country, description: e.description, isVerified: e.isVerified, isHiringPartner: e.isHiringPartner })}>Edit</Button></Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<Building2 />} title="No employers yet." description="Hiring partners appear on the public site and can post jobs." action={<Button size="sm" onClick={() => setEditing({ ...EMPTY })}>Add an employer</Button>} />
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit employer" : "New employer"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="em-name" error={errors.name} required className="sm:col-span-2"><Input id="em-name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
              <Field label="Website" htmlFor="em-web" error={errors.website}><Input id="em-web" type="url" value={editing.website} onChange={(e) => setEditing({ ...editing, website: e.target.value })} placeholder="https://" /></Field>
              <Field label="Industry" htmlFor="em-ind"><Input id="em-ind" value={editing.industry} onChange={(e) => setEditing({ ...editing, industry: e.target.value })} /></Field>
              <Field label="City" htmlFor="em-city"><Input id="em-city" value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} /></Field>
              <Field label="Country (ISO-2)" htmlFor="em-country" error={errors.country}><Input id="em-country" maxLength={2} value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value.toUpperCase() })} /></Field>
              <Field label="Description" htmlFor="em-desc" className="sm:col-span-2"><Textarea id="em-desc" rows={3} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="em-partner">Hiring partner</Label><Switch id="em-partner" checked={editing.isHiringPartner} onCheckedChange={(v) => setEditing({ ...editing, isHiringPartner: v })} /></div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="em-ver">Verified</Label><Switch id="em-ver" checked={editing.isVerified} onCheckedChange={(v) => setEditing({ ...editing, isVerified: v })} /></div>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!editing) return; setErrors({}); const res = await saveEmployerAction({ name: editing.name, website: editing.website, industry: editing.industry, city: editing.city, country: editing.country, logoMediaId: null, description: editing.description, isVerified: editing.isVerified, isHiringPartner: editing.isHiringPartner }, editing.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Employer saved."); setEditing(null); router.refresh(); })}>Save employer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
