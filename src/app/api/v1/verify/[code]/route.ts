import { headers } from "next/headers";
import { handle, jsonOk } from "@/lib/api/respond";
import { verifyCertificate } from "@/server/services/certificates";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/verify/:code — public certificate verification for employers.
 * Accepts either the certificate number or the short verification code.
 */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  await enforceRateLimit(`verify:${ip ?? "unknown"}`, 60, 3600);
  const result = await verifyCertificate(code, { ip, userAgent: h.get("user-agent") });
  return jsonOk(result);
});
