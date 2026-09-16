import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { InvoiceForm } from "./invoice-form";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "New invoice" };
export const dynamic = "force-dynamic";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ student?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("payments.create")]);
  const [student, feePlans] = await Promise.all([
    sp.student ? prisma.studentProfile.findUnique({ where: { id: sp.student }, select: { id: true, studentNumber: true, user: { select: { name: true } } } }) : null,
    prisma.feePlan.findMany({ where: { isActive: true }, include: { course: { select: { title: true } }, installments: { orderBy: { order: "asc" } } }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="New invoice" description="Raise an invoice from a fee plan or build custom lines." breadcrumbs={[{ label: "Invoices", href: "/admin/invoices" }, { label: "New" }]} />
      <div className="surface p-6">
        <InvoiceForm
          preselected={student ? { id: student.id, label: `${student.user.name} · ${student.studentNumber}` } : null}
          feePlans={feePlans.map((f) => ({ id: f.id, courseId: f.courseId, label: `${f.course.title} — ${f.name}`, currency: f.currency, lines: f.installments.length ? f.installments.map((i) => ({ description: `${f.course.title} — ${i.label}`, quantity: 1, unitAmount: toNumber(i.amount), dueAfterDays: i.dueAfterDays })) : [{ description: `${f.course.title} — ${f.name}`, quantity: 1, unitAmount: toNumber(f.totalAmount), dueAfterDays: 0 }] }))}
        />
      </div>
    </div>
  );
}
