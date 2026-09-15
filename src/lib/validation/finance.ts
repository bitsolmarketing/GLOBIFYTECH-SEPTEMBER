import { z } from "zod";
import { money, nonEmpty, uuid } from "./common";

export const paymentProvider = z.enum(["STRIPE", "PAYPAL", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER", "CASH"]);
export const discountType = z.enum(["PERCENT", "FIXED"]);

export const feePlanSchema = z.object({
  courseId: uuid,
  name: nonEmpty.max(80),
  totalAmount: money,
  currency: z.string().length(3).default("PKR"),
  isDefault: z.coerce.boolean().default(false),
  installments: z
    .array(z.object({ label: nonEmpty.max(60), amount: money, dueAfterDays: z.coerce.number().int().min(0).max(730).default(0) }))
    .min(1)
    .max(12),
});

export const createInvoiceSchema = z.object({
  studentId: uuid,
  enrollmentId: uuid.optional().nullable(),
  feePlanId: uuid.optional().nullable(),
  discountCode: z.string().trim().max(40).optional().or(z.literal("")),
  scholarshipAwardId: uuid.optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  lines: z.array(z.object({ description: nonEmpty.max(200), quantity: z.coerce.number().int().min(1).max(100).default(1), unitAmount: money, dueDate: z.coerce.date().optional().nullable() })).min(1).max(24),
});

export const recordPaymentSchema = z.object({
  invoiceId: uuid,
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
  provider: paymentProvider.default("BANK_TRANSFER"),
  method: z.string().trim().max(60).optional().or(z.literal("")),
  providerRef: z.string().trim().max(120).optional().or(z.literal("")),
  paidAt: z.coerce.date().optional(),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export const refundSchema = z.object({
  invoiceId: uuid,
  paymentId: uuid.optional().nullable(),
  amount: money.refine((v) => v > 0, "Amount must be greater than zero"),
  reason: nonEmpty.max(500),
});

export const discountSchema = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Letters, numbers, - and _ only")
    .transform((v) => v.toUpperCase()),
  name: nonEmpty.max(100),
  type: discountType.default("PERCENT"),
  value: money,
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  validFrom: z.coerce.date().optional().nullable(),
  validTo: z.coerce.date().optional().nullable(),
  courseIds: z.array(uuid).max(50).default([]),
  isActive: z.coerce.boolean().default(true),
});

export const scholarshipSchema = z.object({
  name: nonEmpty.max(100),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  type: discountType.default("PERCENT"),
  value: money,
  seats: z.coerce.number().int().min(1).optional().nullable(),
  criteria: z.string().trim().max(1000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export const scholarshipAwardSchema = z.object({ scholarshipId: uuid, studentId: uuid, note: z.string().trim().max(500).optional().or(z.literal("")) });

export const checkoutSchema = z.object({ invoiceId: uuid, provider: paymentProvider });
