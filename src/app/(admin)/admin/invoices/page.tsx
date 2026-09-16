import type { Metadata } from "next";
import Link from "next/link";
import { Receipt, Plus } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listInvoices } from "@/server/services/finance";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDate, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Invoices" };
export const dynamic = "force-dynamic";

const STATUSES = ["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"] as const;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("payments.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = STATUSES.find((s) => s === sp.status);
  const { items, total, pageSize, totals } = await listInvoices({ q: sp.q, status, page, pageSize: 25 });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Invoices" description={`${total.toLocaleString()} invoices · ${formatMoney(totals.invoiced)} invoiced · ${formatMoney(totals.collected)} collected`} actions={can(user, "payments.create") ? <Button asChild size="sm"><Link href="/admin/invoices/new"><Plus /> New invoice</Link></Button> : null} />
      <FilterBar searchPlaceholder="Invoice number or student name" filters={[{ key: "status", label: "statuses", options: STATUSES.map((s) => ({ value: s, label: enumLabel(s) })) }]} />
      {items.length ? (
        <AdminTable headers={["Invoice", "Student", "Course", { label: "Total", align: "end" }, { label: "Paid", align: "end" }, { label: "Balance", align: "end" }, "Due", "Status"]}>
          {items.map((i) => {
            const balance = toNumber(i.total) - toNumber(i.amountPaid);
            const overdue = i.status === "OVERDUE";
            return (
              <Row key={i.id}>
                <Cell><Link href={`/admin/invoices/${i.id}`} className="font-medium hover:text-accent">{i.number}</Link><span className="block text-caption text-fg-subtle">{formatDate(i.createdAt)}</span></Cell>
                <Cell><Link href={`/admin/students/${i.student.id}`} className="hover:text-accent">{i.student.user.name}</Link><span className="block text-caption text-fg-subtle">{i.student.studentNumber}</span></Cell>
                <Cell muted>{i.enrollment?.course.title ?? "—"}</Cell>
                <Cell align="end" className="tabular-nums">{formatMoney(toNumber(i.total), i.currency)}</Cell>
                <Cell align="end" className="tabular-nums text-success">{formatMoney(toNumber(i.amountPaid), i.currency)}</Cell>
                <Cell align="end" className={balance > 0 ? "tabular-nums text-warning" : "tabular-nums text-fg-subtle"}>{formatMoney(balance, i.currency)}</Cell>
                <Cell className={overdue ? "text-caption text-danger" : "text-caption text-fg-muted"}>{i.dueDate ? formatDate(i.dueDate) : "—"}</Cell>
                <Cell><Badge variant={statusVariant(i.status)}>{enumLabel(i.status)}</Badge></Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : (
        <EmptyState icon={<Receipt />} title="No invoices match." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/invoices?${q}`; }} />
    </div>
  );
}
