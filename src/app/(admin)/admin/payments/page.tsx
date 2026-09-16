import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, TrendingUp, AlertTriangle, Receipt } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { financeOverview } from "@/server/services/finance";
import { adminAnalytics } from "@/server/services/analytics";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { TrendChart, BarsChart } from "@/components/charts";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RunRemindersButton } from "./reminders-button";
import { enumLabel, formatDate, formatDateTime, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const user = await requirePermission("payments.read");
  const [overview, analytics, recent, overdue, fees] = await Promise.all([
    financeOverview(),
    adminAnalytics(90),
    prisma.payment.findMany({ where: { status: "SUCCEEDED" }, orderBy: { paidAt: "desc" }, take: 15, include: { invoice: { select: { id: true, number: true, currency: true, student: { select: { id: true, user: { select: { name: true } } } } } }, receipt: { select: { number: true } }, recordedBy: { select: { name: true } } } }),
    prisma.invoice.findMany({ where: { deletedAt: null, status: "OVERDUE" }, orderBy: { dueDate: "asc" }, take: 10, include: { student: { select: { id: true, user: { select: { name: true, phone: true } } } } } }),
    prisma.feePlan.findMany({ where: { isActive: true }, include: { course: { select: { id: true, title: true } }, installments: true, _count: { select: { invoices: true } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Payments" description="Collections, outstanding fees and fee plans." actions={<div className="flex gap-2">{can(user, "payments.create") ? <Button asChild size="sm"><Link href="/admin/invoices/new"><Receipt /> New invoice</Link></Button> : null}{can(user, "payments.create") ? <RunRemindersButton /> : null}</div>} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Wallet} label="Collected this month" value={formatMoney(overview.collectedMonth)} tone="success" />
        <StatTile icon={AlertTriangle} label="Outstanding" value={formatMoney(overview.outstanding)} hint={`${overview.overdue} invoices past due`} tone={overview.outstanding > 0 ? "warning" : "default"} />
        <StatTile icon={TrendingUp} label="Collected (90 days)" value={formatMoney(analytics.revenueSeries.reduce((s, p) => s + p.value, 0))} />
        <StatTile icon={Receipt} label="Fee plans" value={fees.length} hint={`${fees.reduce((s, f) => s + f._count.invoices, 0)} invoices raised`} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface p-5 lg:col-span-2"><p className="text-h4 mb-3">Collections, last 90 days</p><TrendChart data={analytics.revenueSeries} format={(v) => formatMoney(v)} name="Collected" /></div>
        <div className="surface p-5"><p className="text-h4 mb-3">By provider</p><BarsChart data={analytics.revenueByProvider.map((p) => ({ label: enumLabel(p.provider), value: Math.round(p.value) }))} format={(v) => formatMoney(v)} horizontal height={Math.max(200, analytics.revenueByProvider.length * 36)} name="Collected" color="var(--success)" /></div>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Recent payments</p><Link href="/admin/invoices" className="text-caption text-accent hover:underline">All invoices</Link></div>
          {recent.length ? (
            <AdminTable headers={["Student", "Invoice", { label: "Amount", align: "end" }, "When"]} dense>
              {recent.map((p) => (
                <Row key={p.id}>
                  <Cell><Link href={`/admin/students/${p.invoice.student.id}`} className="font-medium hover:text-accent">{p.invoice.student.user.name}</Link><span className="block text-caption text-fg-subtle">{enumLabel(p.provider)}{p.receipt ? ` · ${p.receipt.number}` : ""}</span></Cell>
                  <Cell><Link href={`/admin/invoices/${p.invoice.id}`} className="text-caption hover:text-accent">{p.invoice.number}</Link></Cell>
                  <Cell align="end" className="tabular-nums">{formatMoney(toNumber(p.amount), p.currency)}</Cell>
                  <Cell className="text-caption text-fg-muted">{p.paidAt ? formatDateTime(p.paidAt) : "—"}</Cell>
                </Row>
              ))}
            </AdminTable>
          ) : <EmptyState icon={<Wallet />} title="No payments yet." compact />}
        </div>
        <div>
          <div className="mb-3 flex items-center justify-between"><p className="text-h4">Overdue</p><Link href="/admin/invoices?status=OVERDUE" className="text-caption text-accent hover:underline">View all</Link></div>
          {overdue.length ? (
            <AdminTable headers={["Student", "Invoice", { label: "Balance", align: "end" }, "Due"]} dense>
              {overdue.map((i) => (
                <Row key={i.id}>
                  <Cell><Link href={`/admin/students/${i.student.id}`} className="font-medium hover:text-accent">{i.student.user.name}</Link><span className="block text-caption text-fg-subtle">{i.student.user.phone ?? ""}</span></Cell>
                  <Cell><Link href={`/admin/invoices/${i.id}`} className="text-caption hover:text-accent">{i.number}</Link></Cell>
                  <Cell align="end" className="tabular-nums text-warning">{formatMoney(toNumber(i.total) - toNumber(i.amountPaid), i.currency)}</Cell>
                  <Cell className="text-caption text-danger">{i.dueDate ? formatDate(i.dueDate) : "—"}</Cell>
                </Row>
              ))}
            </AdminTable>
          ) : <p className="surface p-6 text-body-sm text-fg-muted">Nothing overdue. Every invoice is on time.</p>}
        </div>
      </section>
      <section>
        <p className="text-h4 mb-3">Fee plans</p>
        {fees.length ? (
          <AdminTable headers={["Plan", "Course", { label: "Total", align: "end" }, "Installments", { label: "Invoices", align: "end" }, "Default"]}>
            {fees.map((f) => (
              <Row key={f.id}>
                <Cell className="font-medium">{f.name}</Cell>
                <Cell muted><Link href={`/admin/courses/${f.course.id}`} className="hover:text-accent">{f.course.title}</Link></Cell>
                <Cell align="end" className="tabular-nums">{formatMoney(toNumber(f.totalAmount), f.currency)}</Cell>
                <Cell className="text-caption text-fg-muted">{f.installments.length ? f.installments.map((i) => `${i.label} ${formatMoney(toNumber(i.amount), f.currency)}`).join(" · ") : "Single payment"}</Cell>
                <Cell align="end">{f._count.invoices}</Cell>
                <Cell>{f.isDefault ? <Badge variant={statusVariant("ACTIVE")}>Default</Badge> : null}</Cell>
              </Row>
            ))}
          </AdminTable>
        ) : <p className="surface p-6 text-body-sm text-fg-muted">No fee plans yet. Add one from a course page so enrollments can be invoiced automatically.</p>}
      </section>
    </div>
  );
}
