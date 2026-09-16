import { describe, expect, it } from "vitest";
import { can, canAny, canAll, hasRole, canAccessSurface, homeForPrincipal, permissionsForRoles } from "@/lib/rbac";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, ROLE_KEYS, SURFACE_ROLES, type RoleKey } from "@/lib/rbac/permissions";

const principal = (roles: RoleKey[]) => ({ id: "u1", email: "u@example.com", name: "User", image: null, locale: "en", roles, campusId: null });

describe("role to permission matrix", () => {
  it("gives the super admin every permission", () => {
    const perms = permissionsForRoles(["SUPER_ADMIN"]);
    expect(perms.size).toBe(ALL_PERMISSIONS.length);
    for (const p of ALL_PERMISSIONS) expect(perms.has(p)).toBe(true);
  });

  it("withholds impersonation from a plain admin", () => {
    expect(can(principal(["ADMIN"]), "users.impersonate")).toBe(false);
    expect(can(principal(["SUPER_ADMIN"]), "users.impersonate")).toBe(true);
  });

  it("defines a permission set for every role", () => {
    for (const role of ROLE_KEYS) expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
  });

  it("only references permissions that exist", () => {
    for (const role of ROLE_KEYS) {
      for (const p of ROLE_PERMISSIONS[role]) expect(ALL_PERMISSIONS).toContain(p);
    }
  });

  it("gives a guest nothing", () => {
    expect(permissionsForRoles(["GUEST"]).size).toBe(0);
    expect(can(principal(["GUEST"]), "courses.read")).toBe(false);
  });

  it("unions permissions across several roles", () => {
    const both = principal(["COUNSELLOR", "FINANCE_MANAGER"]);
    expect(can(both, "crm.leads.read")).toBe(true);
    expect(can(both, "payments.read")).toBe(true);
  });
});

describe("permission gates used by server guards", () => {
  const instructor = principal(["INSTRUCTOR"]);

  it("lets an instructor grade but not refund", () => {
    expect(can(instructor, "submissions.grade")).toBe(true);
    expect(can(instructor, "payments.refund")).toBe(false);
  });

  it("blocks an instructor from reading leads or issuing certificates", () => {
    expect(can(instructor, "crm.leads.read")).toBe(false);
    expect(can(instructor, "certificates.issue")).toBe(false);
  });

  it("never lets a student reach staff data", () => {
    const student = principal(["STUDENT"]);
    for (const p of ["students.read", "payments.read", "crm.leads.read", "audit.read", "settings.manage", "analytics.read"] as const) {
      expect(can(student, p)).toBe(false);
    }
    expect(can(student, "student.self")).toBe(true);
    expect(can(student, "ai.tutor")).toBe(true);
  });

  it("evaluates canAny and canAll correctly", () => {
    expect(canAny(instructor, ["payments.refund", "submissions.grade"])).toBe(true);
    expect(canAll(instructor, ["payments.refund", "submissions.grade"])).toBe(false);
    expect(canAll(instructor, ["courses.read", "submissions.grade"])).toBe(true);
    expect(canAny(principal(["GUEST"]), ["courses.read"])).toBe(false);
  });

  it("checks roles directly", () => {
    expect(hasRole(instructor, "INSTRUCTOR")).toBe(true);
    expect(hasRole(instructor, "ADMIN")).toBe(false);
    expect(hasRole(principal(["ADMIN", "STUDENT"]), "STUDENT")).toBe(true);
  });
});

describe("surface access", () => {
  it("matches the surface role map", () => {
    for (const [surface, roles] of Object.entries(SURFACE_ROLES)) {
      for (const role of roles) {
        expect(canAccessSurface(principal([role as RoleKey]), surface as keyof typeof SURFACE_ROLES)).toBe(true);
      }
    }
  });

  it("keeps a student out of the admin and instructor surfaces", () => {
    const student = principal(["STUDENT"]);
    expect(canAccessSurface(student, "student")).toBe(true);
    expect(canAccessSurface(student, "admin")).toBe(false);
    expect(canAccessSurface(student, "instructor")).toBe(false);
  });

  it("keeps an instructor out of the admin surface", () => {
    expect(canAccessSurface(principal(["INSTRUCTOR"]), "admin")).toBe(false);
  });

  it("sends each role to its own home", () => {
    expect(homeForPrincipal(principal(["SUPER_ADMIN"]))).toBe("/admin/dashboard");
    expect(homeForPrincipal(principal(["INSTRUCTOR"]))).toBe("/instructor/dashboard");
    expect(homeForPrincipal(principal(["STUDENT"]))).toBe("/student/dashboard");
    expect(homeForPrincipal(null)).toBe("/");
  });

  it("prefers the most privileged surface when a user holds several roles", () => {
    expect(homeForPrincipal(principal(["STUDENT", "ADMIN"]))).toBe("/admin/dashboard");
    expect(homeForPrincipal(principal(["STUDENT", "INSTRUCTOR"]))).toBe("/instructor/dashboard");
  });
});
