import { handle, jsonOk } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { searchProvider } from "@/server/services/search";
import { enforceRateLimit } from "@/server/rate-limit";

export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  await enforceRateLimit(`search:${user.id}`, 120, 60);
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const hits = await searchProvider().search(q, user);
  return jsonOk(hits);
});
