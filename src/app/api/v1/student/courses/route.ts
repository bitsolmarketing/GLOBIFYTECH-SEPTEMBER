import { handle, jsonOk } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/v1/student/courses — enrolled courses with progress and next lesson. */
export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!student) throw AppError.forbidden("Only students can use this endpoint.");
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id, status: { in: ["ACTIVE", "COMPLETED", "PAUSED"] } },
    orderBy: { updatedAt: "desc" },
    include: {
      course: { select: { id: true, slug: true, title: true, artwork: { select: { url: true } }, category: { select: { artworkKey: true } } } },
      progress: true,
      batch: { select: { id: true, code: true, name: true } },
      certificate: { select: { id: true, certificateNumber: true } },
    },
  });
  return jsonOk(
    enrollments.map((e) => ({
      enrollmentId: e.id,
      status: e.status,
      startedAt: e.startedAt,
      course: { id: e.course.id, slug: e.course.slug, title: e.course.title, artwork: e.course.artwork?.url ?? null, artworkKey: e.course.category?.artworkKey ?? null },
      progress: { percent: Math.round(toNumber(e.progress?.percent ?? 0)), lessonsCompleted: e.progress?.lessonsCompleted ?? 0, lessonsTotal: e.progress?.lessonsTotal ?? 0, lastActivityAt: e.progress?.lastActivityAt ?? null, lastLessonId: e.progress?.lastLessonId ?? null },
      batch: e.batch,
      certificate: e.certificate,
    })),
  );
});
