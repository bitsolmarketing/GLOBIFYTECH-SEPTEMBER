import "server-only";
import { Queue } from "bullmq";
import { getRedis } from "@/server/redis";
import { log } from "@/server/log";

/**
 * Job payload registry. Add a job here, implement it in ./processors, and
 * enqueue with `enqueue("email.send", payload)`.
 */
export interface JobPayloads {
  "email.send": { to: string; subject: string; html: string; text?: string };
  "whatsapp.send": { to: string; text?: string; template?: { name: string; language?: string; components?: unknown[] } };
  "sms.send": { to: string; text: string };
  "notification.dispatch": { notificationId: string };
  "certificate.render": { certificateId: string };
  "invoice.render": { invoiceId: string };
  "risk.compute": { studentId?: string; all?: boolean };
  "liveclass.summarize": { liveClassId: string };
  "analytics.daily": { date?: string };
  "backup.heartbeat": { source: string };
}

export type JobName = keyof JobPayloads;

const QUEUE_NAME = "globify";
let queue: Queue | null | undefined;

function getQueue(): Queue | null {
  if (queue !== undefined) return queue;
  const redis = getRedis();
  if (!redis) {
    queue = null;
    return null;
  }
  queue = new Queue(QUEUE_NAME, { connection: redis, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 2000 }, removeOnComplete: 500, removeOnFail: 1000 } });
  return queue;
}

/** Runs a job inline (dev / single instance without Redis). */
async function runInline<N extends JobName>(name: N, payload: JobPayloads[N]) {
  const { processors } = await import("./processors");
  const fn = processors[name] as (p: JobPayloads[N]) => Promise<void>;
  try {
    await fn(payload);
  } catch (error) {
    log.error("inline job failed", { job: name, error: (error as Error).message });
  }
}

/**
 * Enqueue a background job. With Redis, it goes to BullMQ (run `pnpm worker`).
 * Without Redis, it runs after the current tick so the request isn't blocked.
 */
export async function enqueue<N extends JobName>(name: N, payload: JobPayloads[N], opts?: { delayMs?: number; jobId?: string }): Promise<void> {
  const q = getQueue();
  if (q) {
    await q.add(name, payload, { delay: opts?.delayMs, jobId: opts?.jobId });
    return;
  }
  const delay = opts?.delayMs ?? 0;
  setTimeout(() => void runInline(name, payload), delay);
}

export { QUEUE_NAME };
