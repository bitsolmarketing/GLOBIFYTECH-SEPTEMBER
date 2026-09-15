import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Receipt, ArrowRight } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { enumLabel, formatDate, formatMoney, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const { studentId } = await requireStudentProfile();
  const invoices = await prisma.invoice.findMany({ where: { studentId, deletedAt: null, status: { not: "DRAFT" } }, orderBy: { createdAt: "desc" }, include: { enrollment: { select: { course: { select: { title: true } } } }, payments: { where: { status: "SUCCEEDED" }, include: { receipt: true }, orderBy: { paidAt: "desc" } } } });
  const outstanding = invoices.filter((i) => ["ISSUED", "PARTIALLY_PAID", "OVERDUE"].includes(i.status)).reduce((s, i) => s + toNumber(i.total) - toNumber(i.amountPaid), 0);
  const paid = invoices.flatMap((i) => i.payments).reduce((s, p) => s + toNumber(p.amount), 0);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" description="Invoices, receipts and payment options." />
      <div className="grid gap-3 sm:grid-cols-2">
        <StatTile icon={CreditCard} label="Balance due" value={formatMoney(outstanding)} tone={outstanding > 0 ? "warning" : "success"} />
        <StatTile icon={Receipt} label="Paid to date" value={formatMoney(paid)} tone="accent" />
      </div>
      {invoices.length ? (
        <ul className="surface divide-y divide-border">
          {invoices.map((i) => {
            const balance = toNumber(i.total) - toNumber(i.amountPaid);
            return (
              <li key={i.id}>
                <Link href={`/student/payments/${i.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-bg-subtle">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.number} <span className="font-normal text-fg-muted">· {i.enrollment?.course.title ?? "Fees"}</span></p>
                    <p className="text-caption text-fg-muted">{formatMoney(toNumber(i.total), i.currency)}{balance > 0 ? ` · ${formatMoney(balance, i.currency)} due ${i.dueDate ? formatDate(i.dueDate) : ""}` : " · paid in full"}</p>
                  </div>
                  <Badge variant={statusVariant(i.status)}>{enumLabel(i.status)}</Badge>
                  {balance > 0 ? <Button size="sm">Pay</Button> : <ArrowRight className="size-4 text-fg-subtle rtl:rotate-180" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<CreditCard />} title="No invoices yet." description="Invoices appear here when you enroll in a paid course." />
      )}
    </div>
  );
}
