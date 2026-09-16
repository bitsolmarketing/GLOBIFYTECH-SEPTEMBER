import { z } from "zod";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { listInApp, markRead, unreadCount } from "@/server/services/notifications";

export const dynamic = "force-dynamic";

/** GET /api/v1/student/notifications — in-app inbox with the unread count. */
export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  const take = Math.min(100, Number(new URL(req.url).searchParams.get("limit") ?? 30) || 30);
  const [items, unread] = await Promise.all([listInApp(user.id, take), unreadCount(user.id)]);
  return jsonOk(items.map((n) => ({ id: n.id, event: n.event, title: n.title, body: n.body, href: n.href, readAt: n.readAt, createdAt: n.createdAt })), { unread });
});

/** POST /api/v1/student/notifications — mark some or all as read. */
export const POST = handle(async (req) => {
  const user = await requireApiUser(req);
  const input = z.object({ ids: z.array(z.string().uuid()).max(200).optional() }).parse(await readJson(req));
  await markRead(user.id, input.ids);
  return jsonOk({ unread: await unreadCount(user.id) });
});
