"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings, User, LayoutDashboard } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/server/actions/auth";

export interface UserMenuUser {
  name: string;
  email: string;
  image: string | null;
  roleLabel: string;
  /** Other surfaces this user can switch to (e.g. an admin who also teaches). */
  surfaces?: Array<{ label: string; href: string }>;
}

export function UserMenu({ user, surface }: { user: UserMenuUser; surface: "student" | "instructor" | "admin" }) {
  const [pending, start] = React.useTransition();
  const settingsHref = `/${surface}/settings`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 pe-2 transition-colors hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-accent"
          aria-label="Account menu"
        >
          <Avatar name={user.name} src={user.image} size="sm" />
          <span className="hidden max-w-32 truncate text-sm font-medium md:inline">{user.name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <p className="truncate text-sm font-medium text-fg">{user.name}</p>
          <p className="truncate text-caption font-normal text-fg-subtle">{user.email}</p>
          <p className="mt-1 text-caption text-accent">{user.roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {user.surfaces?.length ? (
          <>
            {user.surfaces.map((s) => (
              <DropdownMenuItem key={s.href} asChild>
                <Link href={s.href}>
                  <LayoutDashboard /> {s.label}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <User /> Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings /> Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive disabled={pending} onSelect={() => start(() => void signOutAction())}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
