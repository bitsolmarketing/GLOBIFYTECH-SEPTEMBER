import { z } from "zod";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { completeUpload } from "@/server/services/media";

const schema = z.object({
  mediaId: z.string().uuid(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  alt: z.string().max(200).optional(),
});

export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  const input = schema.parse(await readJson(req));
  const media = await completeUpload(input.mediaId, user.id, input);
  return jsonOk({ id: media.id, url: media.url, kind: media.kind });
});
