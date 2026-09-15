import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/server/db/prisma";
import { log } from "@/server/log";

export interface AuditInput {
  actorId?: string | null;
  actorRoles?: string[];
  action: string; // e.g. "course.publish", "payment.refund"
  entityType: string; // e.g. "Course"
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
}

export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null; requestId: string | null }> {
  try {
    const h = await headers();
    return {
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      userAgent: h.get("user-agent"),
      requestId: h.get("x-request-id"),
    };
  } catch {
    return { ip: null, userAgent: null, requestId: null };
  }
}

const SENSITIVE = /(password|token|secret|hash)/i;

function scrub(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(scrub);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE.test(k) ? "[redacted]" : scrub(v);
  }
  return out;
}

/**
 * Append-only audit record. Never throws: a failed audit write is logged, not
 * surfaced to the user, so a logging outage cannot block critical operations.
 */
export async function audit(input: AuditInput): Promise<void> {
  try {
    const meta = await requestMeta();
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRoles: input.actorRoles ?? [],
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        before: input.before === undefined ? undefined : (scrub(input.before) as object),
        after: input.after === undefined ? undefined : (scrub(input.after) as object),
        ip: meta.ip,
        userAgent: meta.userAgent,
        requestId: meta.requestId,
      },
    });
  } catch (error) {
    log.error("audit write failed", { action: input.action, error: (error as Error).message });
  }
}
