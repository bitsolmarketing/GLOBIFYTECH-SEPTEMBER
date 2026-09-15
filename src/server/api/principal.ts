import "server-only";
import { decode } from "next-auth/jwt";
import { getSession, type SessionUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { can, type Permission, type RoleKey } from "@/lib/rbac";

const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token";

/**
 * Resolves the caller for /api/v1 routes: a Bearer session JWT (mobile) or the
 * web session cookie. Bearer tokens are re-validated against the user's
 * sessionVersion so "sign out everywhere" takes effect immediately.
 */
export async function getApiPrincipal(req: Request): Promise<SessionUser | null> {
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7).trim();
    const payload = await decode({ token, secret: process.env.AUTH_SECRET!, salt: COOKIE_NAME }).catch(() => null);
    if (!payload?.sub) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        locale: true,
        status: true,
        sessionVersion: true,
        avatar: { select: { url: true } },
        roles: { select: { role: { select: { key: true } }, campusId: true } },
      },
    });
    if (!user || user.status !== "ACTIVE" || user.sessionVersion !== payload.sv) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.avatar?.url ?? null,
      locale: user.locale,
      roles: user.roles.map((r) => r.role.key as RoleKey),
      campusId: user.roles.find((r) => r.campusId)?.campusId ?? null,
    };
  }
  return getSession();
}

export async function requireApiUser(req: Request): Promise<SessionUser> {
  const user = await getApiPrincipal(req);
  if (!user) throw AppError.unauthenticated();
  return user;
}

export async function requireApiPermission(req: Request, permission: Permission): Promise<SessionUser> {
  const user = await requireApiUser(req);
  if (!can(user, permission)) throw AppError.forbidden();
  return user;
}
