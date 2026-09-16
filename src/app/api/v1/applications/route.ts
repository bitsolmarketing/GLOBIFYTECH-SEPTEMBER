import { headers } from "next/headers";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { getApiPrincipal } from "@/server/api/principal";
import { applicationSchema } from "@/lib/validation/crm";
import { submitApplication, applicationsForUser } from "@/server/services/applications";
import { enforceRateLimit } from "@/server/rate-limit";
import { AppError } from "@/server/errors";

export const dynamic = "force-dynamic";

/** GET /api/v1/applications — the signed-in applicant's own applications. */
export const GET = handle(async (req) => {
  const user = await getApiPrincipal(req);
  if (!user) throw AppError.unauthenticated();
  const items = await applicationsForUser(user.id);
  return jsonOk(items.map((a) => ({ id: a.id, number: a.number, status: a.status, submittedAt: a.submittedAt, course: a.course, preferredBatch: a.preferredBatch, decisionNote: a.decisionNote })));
});

/**
 * POST /api/v1/applications — submit an admissions application. Works for
 * guests and signed-in users; signed-in submissions attach to the account.
 */
export const POST = handle(async (req) => {
  const user = await getApiPrincipal(req);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceRateLimit(`application:${user?.id ?? ip}`, 5, 3600);
  const input = applicationSchema.parse(await readJson(req));
  const application = await submitApplication(input, { userId: user?.id ?? null, submit: true });
  return jsonOk({ id: application.id, number: application.number, status: application.status }, undefined, { status: 201 });
});
