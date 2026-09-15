import { z } from "zod";
import { handle, jsonError, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { tutorStream } from "@/server/ai/tutor";
import { getSetting } from "@/server/services/settings";

const schema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().nullable().optional(),
  context: z.object({ courseId: z.string().uuid().nullable().optional(), lessonId: z.string().uuid().nullable().optional() }).optional(),
});

export const maxDuration = 60;

export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  if (!(await getSetting("ai.tutorEnabled"))) throw AppError.unavailable("The AI tutor is turned off.");
  const student = await prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (!student) throw AppError.forbidden("The tutor is available to students.");
  const input = schema.parse(await readJson(req));
  try {
    const { result, conversationId } = await tutorStream({ userId: user.id, studentId: student.id, conversationId: input.conversationId ?? null, message: input.message, context: input.context ?? {} });
    const response = result.toTextStreamResponse();
    response.headers.set("x-conversation-id", conversationId);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return jsonError(error);
  }
});
