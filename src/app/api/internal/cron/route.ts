import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { enqueue, type JobName } from "@/server/jobs";
import { env } from "@/config/env";
import { log } from "@/server/log";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TASKS: Record<string, JobName> = {
  daily: "analytics.daily",
  risk: "risk.compute",
};

function authorised(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? new URL(req.url).searchParams.get("key") ?? "";
  const a = Buffer.from(header);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduler entry point. Call from Vercel Cron, a system crontab or any
 * external scheduler with the shared secret:
 *   POST /api/internal/cron?task=daily  Authorization: Bearer $CRON_SECRET
 */
export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const task = new URL(req.url).searchParams.get("task") ?? "daily";
  const job = TASKS[task];
  if (!job) return NextResponse.json({ error: `Unknown task. Use one of: ${Object.keys(TASKS).join(", ")}.` }, { status: 400 });
  await enqueue(job, job === "risk.compute" ? { all: true } : {});
  log.info("cron triggered", { task, job });
  return NextResponse.json({ queued: job });
}

export const GET = POST;
