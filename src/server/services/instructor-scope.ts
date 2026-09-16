import "server-only";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { can } from "@/lib/rbac";
import type { SessionUser } from "@/server/auth/session";

/**
 * Row-level scoping for the Instructor Studio. Academic managers and admins
 * (anyone who can publish courses) see everything; instructors and TAs see
 * only the courses/batches they're assigned to.
 */
export async function instructorScope(user: SessionUser) {
  const bypass = can(user, "courses.publish");
  const profile = await prisma.instructorProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  const instructorId = profile?.id ?? null;
  const courseIds = bypass ? null : (await prisma.instructorCourse.findMany({ where: { instructorId: instructorId ?? "" }, select: { courseId: true } })).map((c) => c.courseId);
  const batchCourseIds = bypass ? null : (await prisma.batch.findMany({ where: { instructorId: instructorId ?? "", deletedAt: null }, select: { courseId: true } })).map((b) => b.courseId);
  const allCourseIds = bypass ? null : [...new Set([...(courseIds ?? []), ...(batchCourseIds ?? [])])];
  return {
    bypass,
    instructorId,
    /** null means "all courses" */
    courseIds: allCourseIds,
    courseWhere: allCourseIds ? { id: { in: allCourseIds } } : {},
    async assertCourse(courseId: string) {
      if (bypass) return;
      if (!allCourseIds?.includes(courseId)) throw AppError.forbidden("You don't teach this course.");
    },
    async assertBatch(batchId: string) {
      if (bypass) return;
      const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { instructorId: true, courseId: true } });
      if (!b || (b.instructorId !== instructorId && !allCourseIds?.includes(b.courseId))) throw AppError.forbidden("You don't teach this batch.");
    },
  };
}

export type InstructorScope = Awaited<ReturnType<typeof instructorScope>>;
