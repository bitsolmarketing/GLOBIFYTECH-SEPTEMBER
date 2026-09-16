import { z } from "zod";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { completeLesson, saveVideoProgress, startLesson } from "@/server/services/progress";
import { enforceRateLimit } from "@/server/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), lessonId: z.string().uuid() }),
  z.object({ action: z.literal("complete"), lessonId: z.string().uuid() }),
  z.object({ action: z.literal("video"), lessonId: z.string().uuid(), positionSeconds: z.number().int().min(0), percent: z.number().min(0).max(100), secondsWatched: z.number().int().min(0).max(3600).optional() }),
]);

/** POST /api/v1/student/progress — record lesson and video progress from the app. */
export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  await enforceRateLimit(`progress:${user.id}`, 600, 60);
  const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!student) throw AppError.forbidden("Only students can use this endpoint.");
  const input = schema.parse(await readJson(req));
  if (input.action === "start") return jsonOk(await startLesson({ studentId: student.id, userId: user.id, lessonId: input.lessonId }));
  if (input.action === "complete") return jsonOk(await completeLesson({ studentId: student.id, userId: user.id, lessonId: input.lessonId }));
  return jsonOk(await saveVideoProgress({ studentId: student.id, userId: user.id, lessonId: input.lessonId, positionSeconds: input.positionSeconds, percent: input.percent, secondsWatched: input.secondsWatched }));
});
