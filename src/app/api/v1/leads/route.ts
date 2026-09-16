import { headers } from "next/headers";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { publicLeadSchema } from "@/lib/validation/crm";
import { capturePublicLead } from "@/server/services/crm";
import { enforceRateLimit } from "@/server/rate-limit";
import { AppError } from "@/server/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/leads — public lead capture for the mobile app, landing pages
 * and partner forms. Rate limited per IP; the honeypot field must stay empty.
 */
export const POST = handle(async (req) => {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await enforceRateLimit(`lead:${ip ?? "unknown"}`, 10, 3600);
  const input = publicLeadSchema.parse(await readJson(req));
  if (input.website) throw AppError.validation("Request rejected.");
  const { lead, duplicate } = await capturePublicLead(input, { ip });
  return jsonOk({ id: lead.id, received: true, duplicate }, undefined, { status: 201 });
});
