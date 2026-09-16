"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createInvoiceAction, searchStudentsAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { SimpleSelect } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";

interface PlanOption { id: string; courseId: string; label: string; currency: string; lines: Array<{ description: string; quantity: number; unitAmount: number; dueAfterDays: number }> }
type Line = { description: string; quantity: number; unitAmount: number; dueDate: string };

export function InvoiceForm({ preselected, feePlans }: { preselected: { id: string; label: string } | null; feePlans: PlanOption[] }) {
  const router = useRouter();
  const [student, setStudent] = React.useState(preselected);
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Array<{ id: string; label: string }>>([]);
  const [planId, setPlanId] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([{ description: "", quantity: 1, unitAmount: 0, dueDate: "" }]);
  const [discountCode, setDiscountCode] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitAmount, 0);

  const applyPlan = (id: string) => {
    setPlanId(id);
    const plan = feePlans.find((p) => p.id === id);
    if (!plan) return;
    const today = Date.now();
    setLines(plan.lines.map((l) => ({ description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, dueDate: new Date(today + l.dueAfterDays * 86400000).toISOString().slice(0, 10) })));
  };
  const search = (value: string) => {
    setQ(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => { const res = await searchStudentsAction(value); if (res.ok) setResults(res.data); }, 300);
  };
  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          if (!student) return;
          setErrors({});
          const res = await createInvoiceAction({ studentId: student.id, feePlanId: planId || null, discountCode, notes, dueDate: dueDate ? new Date(dueDate) : null, lines: lines.map((l) => ({ description: l.description, quantity: l.quantity, unitAmount: l.unitAmount, dueDate: l.dueDate ? new Date(l.dueDate) : null })) });
          if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; }
          toast.success("Invoice created.");
          router.push(`/admin/invoices/${res.data.id}`);
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="inv-student">Student</Label>
        {student ? (
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span>{student.label}</span><Button type="button" variant="ghost" size="sm" onClick={() => { setStudent(null); setResults([]); }}>Change</Button></div>
        ) : (
          <>
            <Input id="inv-student" value={q} onChange={(e) => search(e.target.value)} placeholder="Search by name, email or student number" />
            {q.length >= 2 ? <ul className="max-h-48 overflow-y-auto rounded-md border border-border">{results.map((r) => <li key={r.id}><button type="button" className="w-full px-3 py-2 text-start text-sm hover:bg-bg-subtle" onClick={() => setStudent(r)}>{r.label}</button></li>)}{!results.length ? <li className="px-3 py-2 text-caption text-fg-muted">No students found.</li> : null}</ul> : null}
          </>
        )}
      </div>

      {feePlans.length ? <Field label="Start from a fee plan" htmlFor="inv-plan" hint="Fills the lines below. You can still edit them."><SimpleSelect value={planId || "none"} onValueChange={(v) => (v === "none" ? setPlanId("") : applyPlan(v))} options={[{ value: "none", label: "Custom invoice" }, ...feePlans.map((p) => ({ value: p.id, label: p.label }))]} /></Field> : null}

      <div>
        <div className="mb-2 flex items-center justify-between"><p className="text-label">Lines</p><Button type="button" size="sm" variant="ghost" onClick={() => setLines([...lines, { description: "", quantity: 1, unitAmount: 0, dueDate: "" }])}><Plus /> Add line</Button></div>
        <div className="flex flex-col gap-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_5rem_7rem_9rem_auto] items-center gap-2">
              <Input value={l.description} onChange={(e) => setLines(lines.map((x, ix) => (ix === i ? { ...x, description: e.target.value } : x)))} placeholder="Description" aria-label="Description" />
              <Input type="number" min={1} value={l.quantity} onChange={(e) => setLines(lines.map((x, ix) => (ix === i ? { ...x, quantity: Number(e.target.value) } : x)))} aria-label="Quantity" />
              <Input type="number" min={0} step="0.01" value={l.unitAmount} onChange={(e) => setLines(lines.map((x, ix) => (ix === i ? { ...x, unitAmount: Number(e.target.value) } : x)))} aria-label="Unit amount" />
              <Input type="date" value={l.dueDate} onChange={(e) => setLines(lines.map((x, ix) => (ix === i ? { ...x, dueDate: e.target.value } : x)))} aria-label="Due date" />
              <Button type="button" size="sm" variant="ghost" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, ix) => ix !== i))}><Trash2 /></Button>
            </div>
          ))}
        </div>
        {errors.lines ? <p className="mt-1 text-caption text-danger">{errors.lines.join(" ")}</p> : null}
        <p className="mt-2 text-end text-body font-semibold">Subtotal {formatMoney(subtotal)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Discount code" htmlFor="inv-code" error={errors.discountCode}><Input id="inv-code" value={discountCode} onChange={(e) => setDiscountCode(e.target.value.toUpperCase())} placeholder="Optional" /></Field>
        <Field label="Due date" htmlFor="inv-due" hint="Defaults to the institute setting."><Input id="inv-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
      </div>
      <Field label="Notes" htmlFor="inv-notes"><Textarea id="inv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shown on the invoice PDF" /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button><Button type="submit" loading={pending} disabled={!student || !lines.some((l) => l.description && l.unitAmount > 0)}>Create invoice</Button></div>
    </form>
  );
}
