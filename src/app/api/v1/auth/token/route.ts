import { z } from "zod";
import { encode } from "next-auth/jwt";
import { handle, jsonOk, readJson } from "@/lib/api/respond";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "@/server/auth/password";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import type { RoleKey } from "@/lib/rbac";

const schema = z.object({ email: z.string().email(), password: z.string().min(1), device: z.string().max(120).optional() });
const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";
const MAX_AGE = 30 * 24 * 60 * 60;

/**
 * Mobile / integration sign-in. Returns a session JWT identical in shape to the
 * web cookie so `/api/v1/*` can validate both with one code path.
 */
export const POST = handle(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  await enforceRateLimit(`token:${ip}`, 10, 60);
  const { email, password } = schema.parse(await readJson(req));
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, name: true, email: true, passwordHash: true, status: true, sessionVersion: true, locale: true, lockedUntil: true, roles: { select: { role: { select: { key: true } }, campusId: true } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) throw AppError.unauthenticated("That email and password combination doesn't match.");
  if (user.status !== "ACTIVE") throw AppError.forbidden("This account is not active.");
  if (user.lockedUntil && user.lockedUntil > new Date()) throw AppError.rateLimited("Too many attempts. Try again later.");

  const roles = user.roles.map((r) => r.role.key as RoleKey);
  const token = await encode({
    secret: process.env.AUTH_SECRET!,
    salt: COOKIE_NAME,
    maxAge: MAX_AGE,
    token: { sub: user.id, name: user.name, email: user.email, roles, sv: user.sessionVersion, locale: user.locale, campusId: user.roles.find((r) => r.campusId)?.campusId ?? null, rolesRefreshedAt: Date.now() },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), failedLogins: 0 } });
  return jsonOk({ token, tokenType: "Bearer", expiresIn: MAX_AGE, user: { id: user.id, name: user.name, email: user.email, roles } });
});
