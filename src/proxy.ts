import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { SURFACE_ROLES, type RoleKey } from "@/lib/rbac/permissions";

/**
 * Edge-level gate. Coarse checks only (is there a session? does a role match the
 * surface?). Fine-grained permission checks happen server-side in services.
 */
const SURFACES: Array<{ prefix: string; surface: keyof typeof SURFACE_ROLES }> = [
  { prefix: "/admin", surface: "admin" },
  { prefix: "/instructor", surface: "instructor" },
  { prefix: "/student", surface: "student" },
  { prefix: "/employer", surface: "employer" },
];

const AUTH_PAGES = ["/sign-in", "/sign-up"];

function homeFor(roles: RoleKey[]): string {
  if (roles.some((r) => (SURFACE_ROLES.admin as readonly string[]).includes(r))) return "/admin/dashboard";
  if (roles.some((r) => (SURFACE_ROLES.instructor as readonly string[]).includes(r))) return "/instructor/dashboard";
  if (roles.some((r) => (SURFACE_ROLES.student as readonly string[]).includes(r))) return "/student/dashboard";
  if (roles.some((r) => (SURFACE_ROLES.employer as readonly string[]).includes(r))) return "/employer";
  return "/";
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });
  const roles = ((token?.roles as RoleKey[] | undefined) ?? []).filter(Boolean);

  // Signed-in users skip auth pages.
  if (token && AUTH_PAGES.some((p) => pathname === p)) {
    const next = request.nextUrl.searchParams.get("next");
    return NextResponse.redirect(new URL(next && next.startsWith("/") ? next : homeFor(roles), request.url));
  }

  const gate = SURFACES.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`));
  if (gate) {
    if (!token) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const allowed = SURFACE_ROLES[gate.surface] as readonly string[];
    if (!roles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("x-request-id", requestId);
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/student/:path*",
    "/employer/:path*",
    "/sign-in",
    "/sign-up",
    "/api/v1/:path*",
  ],
};
