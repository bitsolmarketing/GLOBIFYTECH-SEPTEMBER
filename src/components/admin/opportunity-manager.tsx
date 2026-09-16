"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Briefcase, Users, ChevronDown } from "lucide-react";
import { saveJobAction, saveInternshipAction, setJobApplicationStatusAction } from "@/server/actions/admin";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SimpleSelect } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { enumLabel, formatMoney } from "@/lib/utils";

export interface OpportunityApplication { id: string; status: string; matchScore: number | null; studentId: string; studentName: string }
export interface Opportunity {
  id: string; title: string; slug: string; description: string; employerId: string; employerName: string;
  type?: string; location: string; isRemote: boolean; salaryMin?: number | null; salaryMax?: number | null;
  durationWeeks?: number | null; stipend?: number | null; currency: string; status: string; closesAt: string;
  skills: Array<{ skillId: string; name: string; required: boolean }>; applications: OpportunityApplication[];
}

const JOB_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "REMOTE"] as const;
const STATUSES = ["DRAFT", "OPEN", "CLOSED", "FILLED"] as const;
const APP_STATUSES = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"] as const;

export function OpportunityManager({ kind, items, employers, skills }: { kind: "job" | "internship"; items: Opportunity[]; employers: Array<{ id: string; name: string }>; skills: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const isJob = kind === "job";
  const empty = { title: "", description: "", employerId: employers[0]?.id ?? "", type: "FULL_TIME", location: "", isRemote: false, salaryMin: null as number | null, salaryMax: null as number | null, durationWeeks: null as number | null, stipend: null as number | null, currency: "PKR", status: "DRAFT", closesAt: "", skillIds: [] as Array<{ skillId: string; required: boolean }> };
  const [editing, setEditing] = React.useState<(typeof empty & { id?: string }) | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();

  const save = () =>
    start(async () => {
      if (!editing) return;
      setErrors({});
      const base = { employerId: editing.employerId, title: editing.title, description: editing.description, location: editing.location, isRemote: editing.isRemote, currency: editing.currency, status: editing.status as "DRAFT", closesAt: editing.closesAt ? new Date(editing.closesAt) : null, skills: editing.skillIds };
      const res = isJob
        ? await saveJobAction({ ...base, type: editing.type as "FULL_TIME", salaryMin: editing.salaryMin, salaryMax: editing.salaryMax }, editing.id)
        : await saveInternshipAction({ ...base, durationWeeks: editing.durationWeeks, stipend: editing.stipend }, editing.id);
      if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
      toast.success(isJob ? "Job saved." : "Internship saved.");
      setEditing(null);
      router.refresh();
    });

  const setAppStatus = (applicationId: string, status: string) =>
    start(async () => {
      const res = await setJobApplicationStatusAction({ applicationId, status: status as "APPLIED" });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(`Marked ${status.toLowerCase()}.`);
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setEditing({ ...empty })}><Plus /> New {isJob ? "job" : "internship"}</Button></div>
      {items.length ? (
        <div className="flex flex-col gap-3">
          {items.map((o) => (
            <section key={o.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-h4">{o.title}</p>
                  <p className="text-caption text-fg-muted">{o.employerName} · {o.isRemote ? "Remote" : o.location || "On site"}{isJob ? ` · ${enumLabel(o.type ?? "")}` : o.durationWeeks ? ` · ${o.durationWeeks} weeks` : ""}{isJob && o.salaryMin ? ` · ${formatMoney(o.salaryMin, o.currency)}${o.salaryMax ? `–${formatMoney(o.salaryMax, o.currency)}` : ""}` : ""}{!isJob && o.stipend ? ` · ${formatMoney(o.stipend, o.currency)} stipend` : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-1">{o.skills.map((s) => <Badge key={s.skillId} variant={s.required ? "accent" : "default"}>{s.name}</Badge>)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(o.status)}>{enumLabel(o.status)}</Badge>
                  <Button variant="ghost" size="sm" onClick={() => setEditing({ id: o.id, title: o.title, description: o.description, employerId: o.employerId, type: o.type ?? "FULL_TIME", location: o.location, isRemote: o.isRemote, salaryMin: o.salaryMin ?? null, salaryMax: o.salaryMax ?? null, durationWeeks: o.durationWeeks ?? null, stipend: o.stipend ?? null, currency: o.currency, status: o.status, closesAt: o.closesAt, skillIds: o.skills.map((s) => ({ skillId: s.skillId, required: s.required })) })}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === o.id ? null : o.id)}><Users /> {o.applications.length} <ChevronDown className={expanded === o.id ? "rotate-180 transition" : "transition"} /></Button>
                </div>
              </div>
              {expanded === o.id ? (
                o.applications.length ? (
                  <div className="mt-4">
                    <AdminTable headers={["Applicant", { label: "Match", align: "end" }, "Status", { label: "", align: "end" }]} dense>
                      {o.applications.map((a) => (
                        <Row key={a.id}>
                          <Cell><Link href={`/admin/students/${a.studentId}`} className="font-medium hover:text-accent">{a.studentName}</Link></Cell>
                          <Cell align="end">{a.matchScore !== null ? `${a.matchScore}%` : "—"}</Cell>
                          <Cell><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge></Cell>
                          <Cell align="end"><SimpleSelect size="sm" className="w-36" value={a.status} disabled={pending} onValueChange={(v) => setAppStatus(a.id, v)} options={APP_STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))} /></Cell>
                        </Row>
                      ))}
                    </AdminTable>
                  </div>
                ) : <p className="mt-3 text-caption text-fg-muted">No applications yet.</p>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Briefcase />} title={`No ${isJob ? "jobs" : "internships"} yet.`} description="Published openings appear on the public careers page and in every student's career hub." action={<Button size="sm" onClick={() => setEditing({ ...empty })}>Post the first one</Button>} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} {isJob ? "job" : "internship"}</DialogTitle></DialogHeader>
          {editing ? (
            <div className="grid max-h-[60vh] gap-4 overflow-y-auto pe-1 sm:grid-cols-2">
              <Field label="Title" htmlFor="o-title" error={errors.title} required><Input id="o-title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></Field>
              <Field label="Employer" htmlFor="o-emp" error={errors.employerId} required><SimpleSelect value={editing.employerId} onValueChange={(v) => setEditing({ ...editing, employerId: v })} options={employers.map((e) => ({ value: e.id, label: e.name }))} /></Field>
              {isJob ? <Field label="Type" htmlFor="o-type"><SimpleSelect value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })} options={JOB_TYPES.map((t) => ({ value: t, label: enumLabel(t) }))} /></Field> : <Field label="Duration (weeks)" htmlFor="o-dur"><Input id="o-dur" type="number" min={1} value={editing.durationWeeks ?? ""} onChange={(e) => setEditing({ ...editing, durationWeeks: e.target.value ? Number(e.target.value) : null })} /></Field>}
              <Field label="Status" htmlFor="o-status"><SimpleSelect value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v })} options={STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
              <Field label="Location" htmlFor="o-loc"><Input id="o-loc" value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Faisalabad" /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="o-remote">Remote</Label><Switch id="o-remote" checked={editing.isRemote} onCheckedChange={(v) => setEditing({ ...editing, isRemote: v })} /></div>
              {isJob ? (
                <>
                  <Field label="Salary from" htmlFor="o-min"><Input id="o-min" type="number" min={0} value={editing.salaryMin ?? ""} onChange={(e) => setEditing({ ...editing, salaryMin: e.target.value ? Number(e.target.value) : null })} /></Field>
                  <Field label="Salary to" htmlFor="o-max"><Input id="o-max" type="number" min={0} value={editing.salaryMax ?? ""} onChange={(e) => setEditing({ ...editing, salaryMax: e.target.value ? Number(e.target.value) : null })} /></Field>
                </>
              ) : (
                <Field label="Stipend" htmlFor="o-stipend"><Input id="o-stipend" type="number" min={0} value={editing.stipend ?? ""} onChange={(e) => setEditing({ ...editing, stipend: e.target.value ? Number(e.target.value) : null })} /></Field>
              )}
              <Field label="Closes on" htmlFor="o-closes"><Input id="o-closes" type="date" value={editing.closesAt} onChange={(e) => setEditing({ ...editing, closesAt: e.target.value })} /></Field>
              <div className="sm:col-span-2">
                <Label className="mb-2 block">Skills <span className="text-caption text-fg-subtle">(used for graduate matching)</span></Label>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                  {skills.map((s) => {
                    const sel = editing.skillIds.find((x) => x.skillId === s.id);
                    return (
                      <div key={s.id} className="flex items-center justify-between border-b border-border px-3 py-1.5 text-sm last:border-0">
                        <label className="flex flex-1 cursor-pointer items-center gap-2"><Checkbox checked={!!sel} onCheckedChange={(v) => setEditing({ ...editing, skillIds: v ? [...editing.skillIds, { skillId: s.id, required: true }] : editing.skillIds.filter((x) => x.skillId !== s.id) })} />{s.name}</label>
                        {sel ? <label className="flex items-center gap-1 text-caption text-fg-muted"><Checkbox checked={sel.required} onCheckedChange={(v) => setEditing({ ...editing, skillIds: editing.skillIds.map((x) => (x.skillId === s.id ? { ...x, required: !!v } : x)) })} />required</label> : null}
                      </div>
                    );
                  })}
                  {!skills.length ? <p className="p-3 text-caption text-fg-muted">No skills defined yet.</p> : null}
                </div>
              </div>
              <Field label="Description" htmlFor="o-desc" className="sm:col-span-2"><RichTextEditor value={editing.description} onChange={(v) => setEditing({ ...editing, description: v })} /></Field>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button loading={pending} onClick={save}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
