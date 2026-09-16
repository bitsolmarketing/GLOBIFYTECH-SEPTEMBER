"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";
import { NavIcon } from "./nav-icon";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { UserMenu, type UserMenuUser } from "./user-menu";
import { CommandPalette, type CommandDef } from "./command-palette";
import { IconButton, Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tip } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ShellNavItem {
  key: string;
  href: string;
  icon: string;
  label: string;
  badgeCount?: number;
}
export interface ShellNavGroup {
  key: string;
  label: string;
  items: ShellNavItem[];
}

export interface AppShellProps {
  surface: "student" | "instructor" | "admin";
  groups: ShellNavGroup[];
  user: UserMenuUser;
  commands: CommandDef[];
  children: React.ReactNode;
  surfaceLabel: string;
  searchPlaceholder: string;
}

const STORAGE_KEY = "globify.sidebar";

/**
 * The sidebar preference lives in localStorage, which is a client-only value.
 * Exposing it as an external store lets the server render the expanded layout
 * and the client swap to the saved one at hydration, with no state set inside
 * an effect and no flash of the wrong width.
 */
const sidebarListeners = new Set<() => void>();

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function subscribeToSidebar(onChange: () => void): () => void {
  sidebarListeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    sidebarListeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    /* private mode: the preference just will not persist */
  }
  for (const listener of sidebarListeners) listener();
}

function NavList({ groups, collapsed, onNavigate }: { groups: ShellNavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-0.5">
          {!collapsed ? <p className="mb-1.5 px-2.5 text-label text-fg-subtle">{group.label}</p> : <span className="mx-2.5 mb-2 h-px bg-border" />}
          {group.items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const link = (
              <Link
                key={item.key}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group/item relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg",
                  active && "bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
                  collapsed && "justify-center px-0",
                )}
              >
                <NavIcon name={item.icon} className="size-[18px] shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
                {item.badgeCount ? (
                  <span
                    className={cn(
                      "ms-auto rounded-full bg-accent px-1.5 text-[10px] font-semibold leading-4 text-white",
                      collapsed && "absolute -end-0.5 -top-0.5 ms-0",
                    )}
                  >
                    {item.badgeCount > 99 ? "99+" : item.badgeCount}
                  </span>
                ) : null}
              </Link>
            );
            return collapsed ? (
              <Tip key={item.key} label={item.label} side="right">
                {link}
              </Tip>
            ) : (
              link
            );
          })}
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ surface, groups, user, commands, children, surfaceLabel, searchPlaceholder }: AppShellProps) {
  const collapsed = React.useSyncExternalStore(subscribeToSidebar, readSidebarCollapsed, () => false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [paletteOpen, setPaletteOpen] = React.useState(false);



  const toggleCollapsed = () => writeSidebarCollapsed(!collapsed);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:shadow-md">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-surface transition-[width] duration-300 ease-out lg:flex",
          collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]",
        )}
      >
        <div className={cn("flex h-[var(--topbar-height)] items-center border-b border-border", collapsed ? "justify-center px-0" : "justify-between px-4")}>
          {collapsed ? <LogoMark size={26} /> : <Logo size={26} />}
          {!collapsed ? (
            <IconButton label="Collapse sidebar" size="sm" onClick={toggleCollapsed}>
              <PanelLeftClose />
            </IconButton>
          ) : null}
        </div>
        <ScrollArea className="flex-1">
          <NavList groups={groups} collapsed={collapsed} />
        </ScrollArea>
        {collapsed ? (
          <div className="flex justify-center border-t border-border py-3">
            <IconButton label="Expand sidebar" size="sm" onClick={toggleCollapsed}>
              <PanelLeftOpen />
            </IconButton>
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3 text-caption text-fg-subtle">{surfaceLabel}</div>
        )}
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[84%] max-w-xs p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-[var(--topbar-height)] items-center border-b border-border px-4">
            <Logo size={26} />
          </div>
          <ScrollArea className="flex-1">
            <NavList groups={groups} collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-[var(--topbar-height)] items-center gap-2 border-b border-border bg-surface/85 px-3 backdrop-blur-md sm:px-4 lg:px-6">
          <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu />
          </IconButton>
          <div className="lg:hidden">
            <LogoMark size={24} />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPaletteOpen(true)}
            className="ms-1 hidden w-64 justify-start gap-2 text-fg-subtle sm:inline-flex lg:w-80"
            aria-label={searchPlaceholder}
          >
            <Search className="size-4" />
            <span className="truncate font-normal">{searchPlaceholder}</span>
            <kbd className="ms-auto rounded border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle">⌘K</kbd>
          </Button>
          <IconButton label={searchPlaceholder} className="sm:hidden" onClick={() => setPaletteOpen(true)}>
            <Search />
          </IconButton>
          <div className="ms-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
            <UserMenu user={user} surface={surface} />
          </div>
        </header>
        <main id="main" className="flex-1 animate-rise p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} commands={commands} groups={groups} placeholder={searchPlaceholder} />
    </div>
  );
}
