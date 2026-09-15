import { z } from "zod";

export const uuid = z.string().uuid("Invalid identifier");
export const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
export const email = z.string().trim().toLowerCase().email("Enter a valid email address");
export const phone = z
  .string()
  .trim()
  .min(7, "Enter a valid phone number")
  .max(20)
  .regex(/^[+0-9()\-\s]+$/, "Enter a valid phone number");
export const url = z.string().trim().url("Enter a valid URL");
export const optionalUrl = z.union([z.literal(""), url]).transform((v) => (v === "" ? undefined : v));
export const money = z.coerce.number().min(0).max(100_000_000);
export const percentInt = z.coerce.number().int().min(0).max(100);
export const nonEmpty = z.string().trim().min(1, "This field is required");
export const richText = z.string().max(200_000);
export const isoDate = z.coerce.date();

export const pagination = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listQuery = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
  sort: z.string().max(40).optional(),
  dir: z.enum(["asc", "desc"]).default("desc"),
});
export type ListQuery = z.infer<typeof listQuery>;

/** Convert Zod issues into a { field: [messages] } map for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
