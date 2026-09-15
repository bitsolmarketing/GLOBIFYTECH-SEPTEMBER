import "server-only";
import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/server/db/prisma";
import { verifyPassword } from "./password";
import { checkRateLimit } from "@/server/rate-limit";
import { log } from "@/server/log";
import type { RoleKey } from "@/lib/rbac";

const ROLE_REFRESH_MS = 5 * 60 * 1000;
const MAX_FAILED_LOGINS = 10;
const LOCK_MINUTES = 15;

async function loadPrincipal(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      sessionVersion: true,
      locale: true,
      avatar: { select: { url: true } },
      roles: { select: { role: { select: { key: true } }, campusId: true } },
    },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.avatar?.url ?? null,
    locale: user.locale,
    sessionVersion: user.sessionVersion,
    roles: user.roles.map((r) => r.role.key as RoleKey),
    campusId: user.roles.find((r) => r.campusId)?.campusId ?? null,
  };
}

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials, request) {
      const email = String(credentials?.email ?? "")
        .trim()
        .toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      const ip = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      const limit = await checkRateLimit(`signin:${ip}`, 10, 60);
      if (!limit.allowed) throw new Error("RATE_LIMITED");

      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          passwordHash: true,
          status: true,
          failedLogins: true,
          lockedUntil: true,
        },
      });
      if (!user || !user.passwordHash) return null;
      if (user.status === "SUSPENDED") throw new Error("SUSPENDED");
      if (user.lockedUntil && user.lockedUntil > new Date()) throw new Error("LOCKED");

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        const failed = user.failedLogins + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLogins: failed,
            lockedUntil: failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
          },
        });
        return null;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() },
      });
      const principal = await loadPrincipal(user.id);
      if (!principal) return null;
      return principal;
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google({ allowDangerousEmailAccountLinking: false }));
}

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in", error: "/sign-in", verifyRequest: "/verify-email" },
  trustHost: true,
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const p = user as unknown as Awaited<ReturnType<typeof loadPrincipal>>;
        if (p) {
          token.sub = p.id;
          token.roles = p.roles;
          token.campusId = p.campusId;
          token.sv = p.sessionVersion;
          token.locale = p.locale;
          token.rolesRefreshedAt = Date.now();
          token.picture = p.image;
        }
        return token;
      }
      const stale = !token.rolesRefreshedAt || Date.now() - Number(token.rolesRefreshedAt) > ROLE_REFRESH_MS;
      if ((trigger === "update" || stale) && token.sub) {
        const fresh = await loadPrincipal(token.sub);
        if (!fresh || fresh.sessionVersion !== token.sv) {
          log.info("session invalidated", { userId: token.sub });
          return null;
        }
        token.roles = fresh.roles;
        token.campusId = fresh.campusId;
        token.locale = fresh.locale;
        token.name = fresh.name;
        token.picture = fresh.image;
        token.rolesRefreshedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
        session.user.roles = (token.roles as RoleKey[]) ?? [];
        session.user.campusId = (token.campusId as string | null) ?? null;
        session.user.locale = (token.locale as string) ?? "en";
        session.user.image = (token.picture as string | null) ?? null;
      }
      return session;
    },
    async signIn({ user, account }) {
      // OAuth users are created by the adapter; ensure they get the STUDENT role.
      if (account?.provider !== "credentials" && user?.id) {
        const studentRole = await prisma.role.findUnique({ where: { key: "STUDENT" } });
        if (studentRole) {
          await prisma.userRole.upsert({
            where: { userId_roleId: { userId: user.id, roleId: studentRole.id } },
            update: {},
            create: { userId: user.id, roleId: studentRole.id },
          });
        }
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account }) {
      log.info("auth.signIn", { userId: user.id, provider: account?.provider });
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
