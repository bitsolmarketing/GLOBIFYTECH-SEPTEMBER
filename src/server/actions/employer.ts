"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ok, fail, AppError, type ActionResult } from "@/server/errors";
import { requirePermission } from "@/server/auth/session";
import { requireEmployerProfile, setEmployerApplicationStatus } from "@/server/services/employers";
import { audit } from "@/server/audit";
import { uuid } from "@/lib/validation/common";

const schema = z.object({
  applicationId: uuid,
  status: z.enum(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"]),
});

/** Employers move their own applicants through the hiring pipeline. */
export const updateApplicantStatusAction = async (input: z.infer<typeof schema>): Promise<ActionResult> => {
  try {
    const user = await requirePermission("employer.self");
    const parsed = schema.safeParse(input);
    if (!parsed.success) throw AppError.validation();
    const profile = await requireEmployerProfile(user);
    await setEmployerApplicationStatus({ employerId: profile.employerId, applicationId: parsed.data.applicationId, status: parsed.data.status });
    await audit({ actorId: user.id, actorRoles: user.roles, action: "employer.application_status", entityType: "JobApplication", entityId: parsed.data.applicationId, after: { status: parsed.data.status } });
    revalidatePath("/employer");
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
};
