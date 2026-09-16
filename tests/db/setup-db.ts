import { expect } from "vitest";
import { PrismaClient } from "@prisma/client";

/**
 * Integration tests run against a real PostgreSQL. Start one with:
 *
 *   pnpm db:dev      # embedded PostgreSQL (PGlite), no Docker needed
 *
 * then point the tests at it and run them:
 *
 *   TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?pgbouncer=true&connection_limit=1" pnpm test:db
 *
 * They skip themselves when TEST_DATABASE_URL is not set, so the unit suite
 * still runs anywhere, including CI without a database.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";
export const dbAvailable = TEST_DATABASE_URL.length > 0;

let client: PrismaClient | undefined;

export function db(): PrismaClient {
  client ??= new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });
  return client;
}

export async function disconnect() {
  await client?.$disconnect();
  client = undefined;
}

/**
 * Asserts that a statement is rejected by the database, then reconnects.
 *
 * A constraint violation or a trigger raising an exception leaves the session
 * unusable on the embedded development server, so the client is recycled. On a
 * real PostgreSQL the reconnect is harmless.
 */
export async function expectRejected(run: () => Promise<unknown>) {
  let threw = false;
  try {
    await run();
  } catch {
    threw = true;
  }
  await disconnect();
  expect(threw, "expected the database to reject this statement").toBe(true);
}

/** Unique suffix so re-runs never collide with earlier test rows. */
export const uniq = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
