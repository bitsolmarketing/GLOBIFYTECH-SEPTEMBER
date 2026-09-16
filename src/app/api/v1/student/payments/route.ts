import { z } from "zod";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { startCheckout } from "@/server/services/finance";
import { enabledPaymentProviders } from "@/server/providers/payments";
import { paymentProvider } from "@/lib/validation/finance";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function studentId(userId: string) {
  const s = await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!s) throw AppError.forbidden("Only students can use this endpoint.");
  return s.id;
}

/** GET /api/v1/student/payments — invoices with balances and payment methods. */
export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  const id = await studentId(user.id);
  const invoices = await prisma.invoice.findMany({
    where: { studentId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { lines: { orderBy: { order: "asc" } }, payments: { where: { status: "SUCCEEDED" }, include: { receipt: { select: { number: true } } } }, enrollment: { select: { course: { select: { title: true } } } }, pdf: { select: { url: true } } },
  });
  return jsonOk(
    invoices.map((i) => ({
      id: i.id,
      number: i.number,
      status: i.status,
      currency: i.currency,
      total: toNumber(i.total),
      paid: toNumber(i.amountPaid),
      balance: toNumber(i.total) - toNumber(i.amountPaid),
      dueDate: i.dueDate,
      course: i.enrollment?.course.title ?? null,
      pdf: i.pdf?.url ?? null,
      lines: i.lines.map((l) => ({ description: l.description, quantity: l.quantity, amount: toNumber(l.amount), dueDate: l.dueDate })),
      payments: i.payments.map((p) => ({ id: p.id, amount: toNumber(p.amount), provider: p.provider, paidAt: p.paidAt, receipt: p.receipt?.number ?? null })),
    })),
    { methods: enabledPaymentProviders().map((p) => ({ key: p.key, label: p.label })) },
  );
});

/** POST /api/v1/student/payments — start a checkout for one invoice. */
export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  const id = await studentId(user.id);
  const input = z.object({ invoiceId: z.string().uuid(), provider: paymentProvider }).parse(await readJson(req));
  if (input.provider === "CASH") throw AppError.validation("Cash payments are recorded by the finance team at the campus.");
  return jsonOk(await startCheckout({ invoiceId: input.invoiceId, studentId: id, provider: input.provider }));
});
