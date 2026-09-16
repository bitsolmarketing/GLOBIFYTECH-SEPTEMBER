/**
 * Embedded PostgreSQL for local development and CI.
 *
 *   node scripts/pg-dev.mjs [--port 5433] [--dir .pgdata] [--connections 20]
 *
 * Starts PGlite (PostgreSQL compiled to WebAssembly) behind a TCP socket so
 * Prisma, the app and the test suite can connect with a normal DATABASE_URL:
 *
 *   DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1"
 *
 * The pgbouncer flag is required: PGlite keeps one shared session, so Prisma
 * must not reuse prepared statement names across connections.
 *
 * This exists so the project can be developed and tested on a machine without
 * PostgreSQL or Docker installed. Run a real PostgreSQL server in production.
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const port = Number(flag("port", process.env.PGLITE_PORT ?? 5433));
const dir = flag("dir", process.env.PGLITE_DIR ?? ".pgdata");
const maxConnections = Number(flag("connections", process.env.PGLITE_CONNECTIONS ?? 25));

// One bad client must never take the whole server down mid-migration.
process.on("uncaughtException", (error) => console.error("[pg-dev] uncaught:", error?.message ?? error));
process.on("unhandledRejection", (error) => console.error("[pg-dev] unhandled:", error instanceof Error ? error.message : error));

mkdirSync(dir, { recursive: true });
const db = await PGlite.create({ dataDir: dir });
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections });
server.addEventListener("error", (event) => console.error("[pg-dev] server error:", event?.detail ?? event));
await server.start();

console.log(`PGlite listening on 127.0.0.1:${port} (data in ${dir}, up to ${maxConnections} connections)`);
console.log(`DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:${port}/postgres?pgbouncer=true&connection_limit=1"`);

const shutdown = async () => {
  try {
    await server.stop();
    await db.close();
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
