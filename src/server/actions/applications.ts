"use server";

import { revalidatePath } from "next/cache";
import { ok, fail, AppError, type ActionResult } from "@/server/errors";
import { applicationSchema, type ApplicationInput } from "@/lib/validation/crm";
import { fieldErrors } from "@/lib/validation/common";
import { submitApplication } from "@/server/services/applications";
import { getSession } from "@/server/auth/session";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/audit";
import { audit } from "@/server/audit";

export async function submitApplicationAction(input: ApplicationInput, options: { submit: boolean }): Promise<ActionResult<{ id: string; number: string; status: string }>> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  const { ip } = await requestMeta();
  try {
    const session = await getSession();
    await enforceRateLimit(`apply:${session?.id ?? ip ?? "unknown"}`, 6, 3600);
    const app = await submitApplication(parsed.data, { userId: session?.id ?? null, submit: options.submit });
    await audit({ actorId: session?.id ?? null, actorRoles: session?.roles ?? [], action: options.submit ? "application.submit" : "application.draft", entityType: "Application", entityId: app.id, after: { number: app.number, courseId: app.courseId } });
    revalidatePath("/admin/applications");
    return ok({ id: app.id, number: app.number, status: app.status });
  } catch (error) {
    return fail(error);
  }
}
