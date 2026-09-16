import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { enqueue } from "@/server/jobs";
import { enforceRateLimit } from "@/server/rate-limit";
import { env } from "@/config/env";
import { log } from "@/server/log";

export const dynamic = "force-dynamic";

interface ZoomEvent {
  event?: string;
  event_ts?: number;
  payload?: { plainToken?: string; object?: { id?: string; uuid?: string; topic?: string; start_time?: string; recording_files?: Array<{ id: string; file_type: string; play_url?: string; download_url?: string; recording_type?: string }> } };
}

function verify(raw: string, headers: Headers): boolean {
  const secret = env().ZOOM_WEBHOOK_SECRET;
  if (!secret) return false;
  const ts = headers.get("x-zm-request-timestamp");
  const signature = headers.get("x-zm-signature");
  if (!ts || !signature) return false;
  const expected = `v0=${createHmac("sha256", secret).update(`v0:${ts}:${raw}`).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Zoom meeting lifecycle. Started/ended events update the live class, and a
 * completed recording is attached so students can watch it back.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await enforceRateLimit("webhook:zoom", 300, 60);
    const body = JSON.parse(raw) as ZoomEvent;

    // Zoom's endpoint validation challenge.
    if (body.event === "endpoint.url_validation" && body.payload?.plainToken) {
      const secret = env().ZOOM_WEBHOOK_SECRET;
      if (!secret) return NextResponse.json({ error: "Not configured." }, { status: 400 });
      return NextResponse.json({ plainToken: body.payload.plainToken, encryptedToken: createHmac("sha256", secret).update(body.payload.plainToken).digest("hex") });
    }
    if (!verify(raw, req.headers)) {
      log.warn("zoom webhook signature rejected");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }

    const meetingId = body.payload?.object?.id ? String(body.payload.object.id) : null;
    const eventId = `${body.event ?? "unknown"}:${body.payload?.object?.uuid ?? meetingId ?? body.event_ts ?? Date.now()}`;
    const existing = await prisma.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: "ZOOM", providerEventId: eventId } } });
    if (existing?.processedAt) return NextResponse.json({ received: true, duplicate: true });

    const liveClass = meetingId ? await prisma.liveClass.findFirst({ where: { meetingId }, select: { id: true } }) : null;
    if (liveClass) {
      if (body.event === "meeting.started") await prisma.liveClass.update({ where: { id: liveClass.id }, data: { status: "LIVE" } });
      if (body.event === "meeting.ended") await prisma.liveClass.update({ where: { id: liveClass.id }, data: { status: "COMPLETED" } });
      if (body.event === "recording.completed") {
        const file = body.payload?.object?.recording_files?.find((f) => f.file_type === "MP4");
        const url = file?.play_url ?? file?.download_url ?? null;
        if (url) {
          const already = await prisma.liveClassRecording.findFirst({ where: { liveClassId: liveClass.id, url } });
          if (!already) await prisma.liveClassRecording.create({ data: { liveClassId: liveClass.id, url } });
          await enqueue("liveclass.summarize", { liveClassId: liveClass.id });
        }
      }
    }
    await prisma.webhookEvent.upsert({
      where: { provider_providerEventId: { provider: "ZOOM", providerEventId: eventId } },
      update: { processedAt: new Date() },
      create: { provider: "ZOOM", providerEventId: eventId, type: body.event ?? "unknown", payload: body as never, processedAt: new Date() },
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("zoom webhook failed", { error: String(error) });
    return NextResponse.json({ error: "Webhook rejected." }, { status: 400 });
  }
}
