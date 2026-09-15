/**
 * BullMQ worker entry: `pnpm worker`
 * Requires REDIS_URL. Without Redis the app runs jobs inline and this process is unnecessary.
 */
import { Worker } from "bullmq";

try {
  process.loadEnvFile?.(".env");
} catch {
  /* .env is optional when variables are provided by the host */
}

async function main() {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.log("REDIS_URL is not set; the app runs jobs inline. Nothing to do.");
    process.exit(0);
  }
  const { default: Redis } = await import("ioredis");
  const { QUEUE_NAME } = await import("./index");
  const { processors } = await import("./processors");
  const connection = new Redis(url, { maxRetriesPerRequest: null });

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const fn = processors[job.name as keyof typeof processors] as ((payload: unknown) => Promise<void>) | undefined;
      if (!fn) throw new Error(`Unknown job ${job.name}`);
      await fn(job.data);
    },
    { connection, concurrency: 5 },
  );

  worker.on("completed", (job) => console.log(JSON.stringify({ level: "info", msg: "job completed", job: job.name, id: job.id })));
  worker.on("failed", (job, err) => console.error(JSON.stringify({ level: "error", msg: "job failed", job: job?.name, id: job?.id, err: err.message })));

  const shutdown = async () => {
    await worker.close();
    await connection.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  console.log(`Worker listening on queue "${QUEUE_NAME}"`);
}

void main();
