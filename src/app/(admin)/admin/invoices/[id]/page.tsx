import type { Metadata } from "next";
import Link from "next/link";
import { Download, Mail, Phone } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getInvoice } from "@/server/services/finance";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RecordPaymentDialog, RefundDialog, VoidInvoiceButton } from "./invoice-actions";
import { enumLabel, formatDate, formatDateTime, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requirePermission("payments.read")]);
  const inv = await getInvoice(id);
  const total = toNumber(inv.total);
  const paid = toNumber(inv.amountPaid);
  const balance = Math.round((total - paid) * 100) / 100;
  const canRecord = can(user, "payments.create") && inv.status !== "VOID" && balance > 0;
  const canRefund = can(user, "payments.refund") && paid > 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: inv.number }]}
        title={inv.number}
        description={`Issued ${inv.issuedAt ? formatDate(inv.issuedAt) : "—"}${inv.issuedBy ? ` by ${inv.issuedBy.name}` : ""}${inv.dueDate ? ` · due ${formatDate(inv.dueDate)}` : ""}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(inv.status)}>{enumLabel(inv.status)}</Badge>
            {inv.pdf?.url ? <Button asChild variant="outline" size="sm"><a href={inv.pdf.url} download><Download /> PDF</a></Button> : null}
            {canRecord ? <RecordPaymentDialog invoiceId={inv.id} balance={balance} currency={inv.currency} /> : null}
            {canRefund ? <RefundDialog invoiceId={inv.id} maxAmount={paid} currency={inv.currency} payments={inv.payments.filter((p) => p.status === "SUCCEEDED").map((p) => ({ id: p.id, label: `${formatMoney(toNumber(p.amount), p.currency)} · ${enumLabel(p.provider)}${p.paidAt ? ` · ${formatDate(p.paidAt)}` : ""}` }))} /> : null}
            {can(user, "payments.create") && inv.status !== "VOID" && paid === 0 ? <VoidInvoiceButton invoiceId={inv.id} /> : null}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="surface overflow-hidden">
            <AdminTable headers={["Description", { label: "Qty", align: "end" }, { label: "Unit", align: "end" }, { label: "Amount", align: "end" }, "Due"]} className="border-0">
              {inv.lines.map((l) => (
                <Row key={l.id}>
                  <Cell>{l.description}</Cell>
                  <Cell align="end">{l.quantity}</Cell>
                  <Cell align="end" className="tabular-nums">{formatMoney(toNumber(l.unitAmount), inv.currency)}</Cell>
                  <Cell align="end" className="tabular-nums">{formatMoney(toNumber(l.amount), inv.currency)}</Cell>
                  <Cell muted className="text-caption">{l.dueDate ? formatDate(l.dueDate) : "—"}</Cell>
                </Row>
              ))}
            </AdminTable>
            <dl className="flex flex-col gap-1 border-t border-border p-4 text-sm">
              <div className="flex justify-between"><dt className="text-fg-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(toNumber(inv.subtotal), inv.currency)}</dd></div>
              {toNumber(inv.discountTotal) > 0 ? <div className="flex justify-between"><dt className="text-fg-muted">Discount{inv.discount ? ` (${inv.discount.code})` : ""}</dt><dd className="tabular-nums text-success">−{formatMoney(toNumber(inv.discountTotal), inv.currency)}</dd></div> : null}
              <div className="flex justify-between text-body font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(total, inv.currency)}</dd></div>
              <div className="flex justify-between"><dt className="text-fg-muted">Paid</dt><dd className="tabular-nums text-success">{formatMoney(paid, inv.currency)}</dd></div>
              <div className="flex justify-between text-body font-semibold"><dt>Balance</dt><dd className={balance > 0 ? "tabular-nums text-warning" : "tabular-nums"}>{formatMoney(balance, inv.currency)}</dd></div>
              <Progress value={total ? Math.min(100, Math.round((paid / total) * 100)) : 100} size="sm" className="mt-2" tone={balance > 0 ? "warning" : "success"} />
            </dl>
            {inv.notes ? <p className="border-t border-border p-4 text-caption text-fg-muted">{inv.notes}</p> : null}
          </section>

          <section>
            <p className="text-h4 mb-3">Payments</p>
            {inv.payments.length ? (
              <AdminTable headers={["Date", "Provider", "Reference", { label: "Amount", align: "end" }, "Receipt", "Status"]} dense>
                {inv.payments.map((p) => (
                  <Row key={p.id}>
                    <Cell className="text-caption">{p.paidAt ? formatDateTime(p.paidAt) : formatDateTime(p.createdAt)}</Cell>
                    <Cell className="text-caption">{enumLabel(p.provider)}{p.method ? <span className="block text-fg-subtle">{p.method}</span> : null}</Cell>
                    <Cell className="text-caption text-fg-muted">{p.providerRef ?? "—"}{p.recordedBy ? <span className="block text-fg-subtle">by {p.recordedBy.name}</span> : null}</Cell>
                    <Cell align="end" className="tabular-nums">{formatMoney(toNumber(p.amount), p.currency)}</Cell>
                    <Cell className="text-caption">{p.receipt?.number ?? "—"}</Cell>
                    <Cell><Badge variant={statusVariant(p.status)}>{enumLabel(p.status)}</Badge></Cell>
                  </Row>
                ))}
              </AdminTable>
            ) : <p className="surface p-6 text-body-sm text-fg-muted">No payments recorded.</p>}
          </section>

          {inv.refunds.length ? (
            <section>
              <p className="text-h4 mb-3">Refunds</p>
              <AdminTable headers={["Date", { label: "Amount", align: "end" }, "Reason", "Status"]} dense>
                {inv.refunds.map((r) => (
                  <Row key={r.id}>
                    <Cell className="text-caption">{formatDateTime(r.createdAt)}</Cell>
                    <Cell align="end" className="tabular-nums text-danger">−{formatMoney(toNumber(r.amount), inv.currency)}</Cell>
                    <Cell className="text-caption text-fg-muted">{r.reason}</Cell>
                    <Cell><Badge variant={statusVariant(r.status)}>{enumLabel(r.status)}</Badge></Cell>
                  </Row>
                ))}
              </AdminTable>
            </section>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="surface p-5">
            <p className="text-label mb-2 text-fg-subtle">Billed to</p>
            <Link href={`/admin/students/${inv.student.id}`} className="text-body font-medium hover:text-accent">{inv.student.user.name}</Link>
            <p className="text-caption text-fg-subtle">{inv.student.studentNumber}</p>
            <ul className="mt-2 space-y-1 text-caption text-fg-muted">
              <li className="flex items-center gap-2"><Mail className="size-3.5" /><a href={`mailto:${inv.student.user.email}`} className="truncate hover:text-accent">{inv.student.user.email}</a></li>
              <li className="flex items-center gap-2"><Phone className="size-3.5" />{inv.student.user.phone ?? "—"}</li>
            </ul>
          </div>
          {inv.enrollment ? <div className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Enrollment</p><Link href={`/admin/courses/${inv.enrollment.course.id}`} className="text-sm font-medium hover:text-accent">{inv.enrollment.course.title}</Link>{inv.enrollment.batch ? <p className="text-caption text-fg-subtle">{inv.enrollment.batch.code}</p> : null}</div> : null}
          {inv.feePlan ? <div className="surface p-5"><p className="text-label mb-2 text-fg-subtle">Fee plan</p><p className="text-sm">{inv.feePlan.name}</p><p className="text-caption text-fg-subtle">{formatMoney(toNumber(inv.feePlan.totalAmount), inv.feePlan.currency)}</p></div> : null}
        </aside>
      </div>
    </div>
  );
}
