"use server";

import { revalidatePath } from "next/cache";
import { ok, fail, AppError, type ActionResult } from "@/server/errors";
import { getSession } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { ensureStudentProfile } from "@/server/services/users";
import { enrollStudent } from "@/server/services/enrollments";
import { createInvoiceFromFeePlan } from "@/server/services/finance";
import { audit } from "@/server/audit";
import { enforceRateLimit } from "@/server/rate-limit";

/**
 * Direct enrollment from a course page. Free courses enroll immediately; paid
 * courses enroll and issue the default fee-plan invoice so the student can pay
 * online or by bank transfer. Returns where to send the student next.
 */
export async function enrollNowAction(input: { courseId: string; batchId?: string | null; feePlanId?: string | null }): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const session = await getSession();
    if (!session) return fail(AppError.unauthenticated());
    await enforceRateLimit(`enroll:${session.id}`, 10, 3600);
    const course = await prisma.course.findFirst({ where: { id: input.courseId, status: "PUBLISHED", deletedAt: null }, include: { feePlans: { where: { isActive: true }, orderBy: { isDefault: "desc" } } } });
    if (!course) return fail(AppError.notFound("Course"));
    const student = await ensureStudentProfile(session.id);
    const existing = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId: student.id, courseId: course.id } } });
    if (existing) return ok({ redirectTo: `/student/course/${course.id}` });

    const enrollment = await enrollStudent({ studentId: student.id, courseId: course.id, batchId: input.batchId ?? null, source: "DIRECT" });
    const plan = input.feePlanId ? course.feePlans.find((p) => p.id === input.feePlanId) : course.feePlans[0];
    let redirectTo = `/student/course/${course.id}`;
    if (plan && Number(plan.totalAmount) > 0) {
      const invoice = await createInvoiceFromFeePlan({ studentId: student.id, enrollmentId: enrollment.id, feePlanId: plan.id, issuedById: session.id });
      redirectTo = `/student/payments/${invoice.id}`;
    }
    await audit({ actorId: session.id, actorRoles: session.roles, action: "enrollment.self", entityType: "Enrollment", entityId: enrollment.id, after: { courseId: course.id, batchId: input.batchId ?? null } });
    revalidatePath("/student/dashboard");
    return ok({ redirectTo });
  } catch (error) {
    return fail(error);
  }
}
