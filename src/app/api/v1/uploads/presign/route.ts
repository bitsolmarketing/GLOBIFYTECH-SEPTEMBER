import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { presignSchema, presignUpload } from "@/server/services/media";
import { enforceRateLimit } from "@/server/rate-limit";

export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  await enforceRateLimit(`upload:${user.id}`, 60, 3600);
  const input = presignSchema.parse(await readJson(req));
  const result = await presignUpload(input, user.id);
  return jsonOk(result);
});
