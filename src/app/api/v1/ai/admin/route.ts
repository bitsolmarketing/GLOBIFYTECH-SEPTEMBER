import { z } from "zod";
import { handle, jsonError, readJson } from "@/lib/api/respond";
import { requireApiPermission } from "@/server/api/principal";
import { AppError } from "@/server/errors";
import { adminAssistantStream } from "@/server/ai/admin-assistant";
import { getSetting } from "@/server/services/settings";

const schema = z.object({ message: z.string().trim().min(1).max(4000), conversationId: z.string().uuid().nullable().optional() });

export const maxDuration = 60;

export const POST = handle(async (req) => {
  const user = await requireApiPermission(req, "ai.admin_assistant");
  if (!(await getSetting("ai.adminAssistantEnabled"))) throw AppError.unavailable("The admin assistant is turned off.");
  const input = schema.parse(await readJson(req));
  try {
    const { result, conversationId, availableTools } = await adminAssistantStream({ user, conversationId: input.conversationId ?? null, message: input.message });
    const response = result.toTextStreamResponse();
    response.headers.set("x-conversation-id", conversationId);
    response.headers.set("x-available-tools", availableTools.join(","));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return jsonError(error);
  }
});
