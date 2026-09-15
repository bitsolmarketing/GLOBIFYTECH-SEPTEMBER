import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { getRedis } from "@/server/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "down" | "disabled"> = { db: "down", redis: "disabled", storage: "ok" };
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "down";
  }
  const redis = getRedis();
  if (redis) {
    try {
      const pong = await redis.ping();
      checks.redis = pong === "PONG" ? "ok" : "down";
    } catch {
      checks.redis = "down";
    }
  }
  const status = checks.db === "ok" ? 200 : 503;
  return NextResponse.json({ status: status === 200 ? "ok" : "degraded", checks, time: new Date().toISOString() }, { status });
}
