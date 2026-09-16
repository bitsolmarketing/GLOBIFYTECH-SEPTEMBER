"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, Eye } from "lucide-react";
import { decideApplicationAction } from "@/server/actions/admin";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/ui/select";
import { Field } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";

type Decision = "APPROVED" | "REJECTED" | "WAITLISTED" | "UNDER_REVIEW";

export function DecisionForm({ applicationId, status, preferredBatchId, batches, feePlans }: { applicationId: string; status: string; preferredBatchId: string | null; batches: Array<{ id: string; label: string }>; feePlans: Array<{ id: string; label: string; isDefault: boolean }> }) {
  const router = useRouter();
  const [decision, setDecision] = React.useState<Decision>("APPROVED");
  const [batchId, setBatchId] = React.useState(preferredBatchId && batches.some((b) => b.id === preferredBatchId) ? preferredBatchId : "");
  const [feePlanId, setFeePlanId] = React.useState(feePlans.find((f) => f.isDefault)?.id ?? feePlans[0]?.id ?? "");
  const [note, setNote] = React.useState("");
  const [pending, start] = React.useTransition();
  const submit = () =>
    start(async () => {
      const res = await decideApplicationAction({ applicationId, decision, note: note.trim() || undefined, batchId: decision === "APPROVED" ? batchId || null : null, feePlanId: decision === "APPROVED" ? feePlanId || null : null });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(decision === "APPROVED" ? "Approved. Student account, enrollment and invoice created." : `Application ${decision.toLowerCase().replace("_", " ")}.`);
      router.refresh();
    });
  const options: Array<{ key: Decision; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
    { key: "APPROVED", label: "Approve", icon: CheckCircle2, tone: "text-success" },
    { key: "WAITLISTED", label: "Waitlist", icon: Clock, tone: "text-warning" },
    { key: "UNDER_REVIEW", label: "Under review", icon: Eye, tone: "text-info" },
    { key: "REJECTED", label: "Reject", icon: XCircle, tone: "text-danger" },
  ];
  return (
    <div className="surface flex flex-col gap-4 p-5">
      <p className="text-h4">Decision</p>
      <div className="grid grid-cols-2 gap-2">
        {options.filter((o) => o.key !== status).map((o) => (
          <button key={o.key} type="button" onClick={() => setDecision(o.key)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${decision === o.key ? "border-accent bg-accent-soft" : "border-border hover:bg-bg-subtle"}`}><o.icon className={`size-4 ${o.tone}`} />{o.label}</button>
        ))}
      </div>
      {decision === "APPROVED" ? (
        <>
          <Field label="Batch" htmlFor="d-batch" hint={batches.length ? "Only planned or open batches are listed." : "No open batch for this course; the student is enrolled self-paced."}><SimpleSelect value={batchId || "none"} onValueChange={(v) => setBatchId(v === "none" ? "" : v)} options={[{ value: "none", label: "No batch yet" }, ...batches.map((b) => ({ value: b.id, label: b.label }))]} disabled={!batches.length} /></Field>
          <Field label="Fee plan" htmlFor="d-plan" hint={feePlans.length ? "An invoice is issued and the applicant is emailed a payment link." : "No fee plan on this course. Enrollment proceeds without an invoice."}><SimpleSelect value={feePlanId || "none"} onValueChange={(v) => setFeePlanId(v === "none" ? "" : v)} options={[{ value: "none", label: "No invoice" }, ...feePlans.map((f) => ({ value: f.id, label: f.label }))]} disabled={!feePlans.length} /></Field>
        </>
      ) : null}
      <Field label={decision === "REJECTED" ? "Reason (sent to applicant)" : "Note (sent to applicant)"} htmlFor="d-note"><Textarea id="d-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <Button loading={pending} variant={decision === "REJECTED" ? "danger" : "primary"} onClick={submit}>{options.find((o) => o.key === decision)?.label}</Button>
    </div>
  );
}
