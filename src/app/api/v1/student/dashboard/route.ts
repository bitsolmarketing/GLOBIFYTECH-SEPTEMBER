import { handle, jsonOk } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { getStudentCockpit } from "@/server/services/students";

export const dynamic = "force-dynamic";

/** GET /api/v1/student/dashboard — the whole student cockpit in one call. */
export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  return jsonOk(await getStudentCockpit(user.id));
});
