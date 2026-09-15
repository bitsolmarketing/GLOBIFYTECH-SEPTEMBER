import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@/lib/rbac";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: RoleKey[];
      campusId: string | null;
      locale: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: RoleKey[];
    campusId?: string | null;
    sv?: number;
    locale?: string;
    rolesRefreshedAt?: number;
  }
}
