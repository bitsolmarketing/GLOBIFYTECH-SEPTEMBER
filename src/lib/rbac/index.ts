import {
  ROLE_PERMISSIONS,
  SURFACE_ROLES,
  type Permission,
  type RoleKey,
  type Surface,
} from "./permissions";

export * from "./permissions";

/** Minimal principal shape shared by session tokens and API tokens. */
export interface Principal {
  id: string;
  roles: RoleKey[];
  /** Explicit permission overrides resolved from DB (optional). */
  permissions?: Permission[];
  campusId?: string | null;
}

/** Resolve the effective permission set for a list of roles (pure). */
export function permissionsForRoles(roles: readonly RoleKey[]): Set<Permission> {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const p of ROLE_PERMISSIONS[role] ?? []) set.add(p);
  }
  return set;
}

/** True if the principal holds the permission via any role or override. */
export function can(principal: Principal | null | undefined, permission: Permission): boolean {
  if (!principal) return false;
  if (principal.roles.includes("SUPER_ADMIN")) return true;
  if (principal.permissions?.includes(permission)) return true;
  return permissionsForRoles(principal.roles).has(permission);
}

export function canAny(principal: Principal | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(principal, p));
}

export function canAll(principal: Principal | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => can(principal, p));
}

export function hasRole(principal: Principal | null | undefined, ...roles: RoleKey[]): boolean {
  if (!principal) return false;
  return roles.some((r) => principal.roles.includes(r));
}

export function canAccessSurface(principal: Principal | null | undefined, surface: Surface): boolean {
  if (!principal) return false;
  const allowed = SURFACE_ROLES[surface] as readonly RoleKey[];
  return principal.roles.some((r) => allowed.includes(r));
}

/** The default landing surface for a principal after sign-in. */
export function homeForPrincipal(principal: Principal | null | undefined): string {
  if (!principal) return "/";
  if (canAccessSurface(principal, "admin")) return "/admin/dashboard";
  if (canAccessSurface(principal, "instructor")) return "/instructor/dashboard";
  if (canAccessSurface(principal, "student")) return "/student/dashboard";
  if (canAccessSurface(principal, "employer")) return "/employer";
  return "/";
}

export class AuthorizationError extends Error {
  readonly code = "FORBIDDEN" as const;
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  readonly code = "UNAUTHENTICATED" as const;
  constructor(message = "Please sign in to continue.") {
    super(message);
    this.name = "AuthenticationError";
  }
}
