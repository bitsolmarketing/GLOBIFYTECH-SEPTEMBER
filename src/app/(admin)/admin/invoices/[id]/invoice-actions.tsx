"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Wallet, Undo2, Ban } from "lucide-react";
import { recordPaymentAction, refundAction, voidInvoiceAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { SimpleSelect } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { enumLabel, formatMoney } from "@/lib/utils";

const PROVIDERS = ["BANK_TRANSFER", "CASH", "JAZZCASH", "EASYPAISA", "STRIPE", "PAYPAL"] as const;

export function RecordPaymentDialog({ invoiceId, balance, currency }: { invoiceId: string; balance: number; currency: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ amount: String(balance), provider: "BANK_TRANSFER" as (typeof PROVIDERS)[number], method: "", providerRef: "", paidAt: new Date().toISOString().slice(0, 10), note: "" });
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}><Wallet /> Record payment</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record a payment</DialogTitle><DialogDescription>For cash, bank transfer or any payment taken outside the online checkout. A receipt is generated and the student is notified.</DialogDescription></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Amount (balance ${formatMoney(balance, currency)})`} htmlFor="p-amount" error={errors.amount} required><Input id="p-amount" type="number" step="0.01" min={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            <Field label="Provider" htmlFor="p-provider"><SimpleSelect value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v as (typeof PROVIDERS)[number] })} options={PROVIDERS.map((p) => ({ value: p, label: enumLabel(p) }))} /></Field>
            <Field label="Method" htmlFor="p-method" hint="e.g. Meezan Bank, counter cash"><Input id="p-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} /></Field>
            <Field label="Reference" htmlFor="p-ref" hint="Transaction or slip number"><Input id="p-ref" value={form.providerRef} onChange={(e) => setForm({ ...form, providerRef: e.target.value })} /></Field>
            <Field label="Paid on" htmlFor="p-date"><Input id="p-date" type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></Field>
            <Field label="Note" htmlFor="p-note" className="sm:col-span-2"><Input id="p-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { setErrors({}); const res = await recordPaymentAction({ invoiceId, amount: Number(form.amount), provider: form.provider, method: form.method, providerRef: form.providerRef, paidAt: new Date(form.paidAt), note: form.note }); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success(`Payment recorded. Receipt ${res.data.receipt}.`); setOpen(false); router.refresh(); })}>Record payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function RefundDialog({ invoiceId, maxAmount, currency, payments }: { invoiceId: string; maxAmount: number; currency: string; payments: Array<{ id: string; label: string }> }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ amount: String(maxAmount), paymentId: payments[0]?.id ?? "", reason: "" });
  const [pending, start] = React.useTransition();
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Undo2 /> Refund</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refund</DialogTitle><DialogDescription>Records the refund against this invoice and notifies the student. Money movement happens in your payment provider or bank.</DialogDescription></DialogHeader>
          <div className="grid gap-4">
            <Field label={`Amount (paid ${formatMoney(maxAmount, currency)})`} htmlFor="r-amount" required><Input id="r-amount" type="number" step="0.01" min={0.01} max={maxAmount} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
            {payments.length ? <Field label="Against payment" htmlFor="r-payment"><SimpleSelect value={form.paymentId || "none"} onValueChange={(v) => setForm({ ...form, paymentId: v === "none" ? "" : v })} options={[{ value: "none", label: "Not linked to one payment" }, ...payments.map((p) => ({ value: p.id, label: p.label }))]} /></Field> : null}
            <Field label="Reason" htmlFor="r-reason" required><Textarea id="r-reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Withdrew before the batch started" /></Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="danger" loading={pending} disabled={!form.reason.trim()} onClick={() => start(async () => { const res = await refundAction({ invoiceId, paymentId: form.paymentId || null, amount: Number(form.amount), reason: form.reason.trim() }); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Refund recorded."); setOpen(false); router.refresh(); })}>Refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function VoidInvoiceButton({ invoiceId }: { invoiceId: string }) {
  return <ConfirmAction title="Void this invoice?" description="The invoice stops counting towards outstanding fees. Only possible while nothing has been paid." confirmLabel="Void" variant="ghost" action={() => voidInvoiceAction(invoiceId)} successMessage="Invoice voided."><Ban /> Void</ConfirmAction>;
}
