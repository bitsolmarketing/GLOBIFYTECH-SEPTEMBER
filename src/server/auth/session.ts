import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "./config";
import {
  can,
  canAccessSurface,
  type Permission,
  type Principal,
  type RoleKey,
  type Surface,
} from "@/lib/rbac";
import { AppError } from "@/server/errors";
import { prisma } from "@/server/db/prisma";

export interface SessionUser extends Principal {
  email: string;
  name: string;
  image: string | null;
  locale: string;
}

/** Cached per request: the current principal or null. */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    image: session.user.image ?? null,
    locale: session.user.locale ?? "en",
    roles: (session.user.roles ?? []) as RoleKey[],
    campusId: session.user.campusId ?? null,
  };
});

/** Throws UNAUTHENTICATED when no session exists. For services / actions. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw AppError.unauthenticated();
  return user;
}

/** Throws FORBIDDEN when the principal lacks the permission. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, permission)) throw AppError.forbidden();
  return user;
}

export async function requireAnyPermission(...permissions: Permission[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!permissions.some((p) => can(user, p))) throw AppError.forbidden();
  return user;
}

/** For layouts/pages: redirect instead of throwing. */
export async function requireSurface(surface: Surface, nextPath?: string): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/sign-in${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`);
  if (!canAccessSurface(user, surface)) redirect("/403");
  return user;
}

export async function requirePagePermission(permission: Permission): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/sign-in");
  if (!can(user, permission)) redirect("/403");
  return user;
}

/** Resolves the student profile id for the current user (row-level scoping). */
export const getStudentProfileId = cache(async (userId: string): Promise<string | null> => {
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
});

export async function requireStudentProfile(): Promise<{ user: SessionUser; studentId: string }> {
  const user = await requireUser();
  const studentId = await getStudentProfileId(user.id);
  if (!studentId) throw AppError.forbidden("Only students can perform this action.");
  return { user, studentId };
}

export const getInstructorProfileId = cache(async (userId: string): Promise<string | null> => {
  const profile = await prisma.instructorProfile.findUnique({ where: { userId }, select: { id: true } });
  return profile?.id ?? null;
});

export async function requireInstructorProfile(): Promise<{ user: SessionUser; instructorId: string }> {
  const user = await requireUser();
  const instructorId = await getInstructorProfileId(user.id);
  if (!instructorId && !can(user, "courses.publish")) {
    throw AppError.forbidden("Only instructors can perform this action.");
  }
  return { user, instructorId: instructorId ?? "" };
}
