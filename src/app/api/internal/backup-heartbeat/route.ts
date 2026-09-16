import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { enqueue } from "@/server/jobs";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

/**
 * The backup script posts here after a successful dump so the admin can see
 * that backups are actually running:
 *   curl -XPOST -H "Authorization: Bearer $BACKUP_HEARTBEAT_SECRET" .../api/internal/backup-heartbeat
 */
export async function POST(req: Request) {
  const secret = env().BACKUP_HEARTBEAT_SECRET;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const source = new URL(req.url).searchParams.get("source") ?? "backup-script";
  await enqueue("backup.heartbeat", { source });
  return NextResponse.json({ ok: true, source });
}
