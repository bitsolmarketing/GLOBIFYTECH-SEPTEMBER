"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { Avatar } from "@/components/ui/avatar";

export interface HeaderNavItem {
  id: string;
  label: string;
  href: string;
  description?: string | null;
  children?: HeaderNavItem[];
}

export interface SiteHeaderProps {
  items: HeaderNavItem[];
  user: { name: string; image: string | null; home: string } | null;
  labels: { signIn: string; signUp: string; dashboard: string; openMenu: string; apply: string };
}

export function SiteHeader({ items, user, labels }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled ? "border-border bg-bg/80 shadow-xs backdrop-blur-xl" : "border-transparent bg-transparent",
      )}
    >
      <div className="container-x flex h-16 items-center gap-6">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {items.map((item) =>
            item.children?.length ? (
              <div key={item.id} className="group relative">
                <button
                  type="button"
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg",
                    isActive(item.href) && "text-fg",
                  )}
                  aria-haspopup="true"
                >
                  {item.label}
                  <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
                </button>
                <div className="invisible absolute start-0 top-full pt-2 opacity-0 transition-[opacity,visibility] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="w-72 rounded-xl border border-border bg-surface-raised p-2 shadow-lg">
                    {item.children.map((child) => (
                      <Link key={child.id} href={child.href} className="flex flex-col gap-0.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-bg-muted">
                        <span className="text-sm font-medium text-fg">{child.label}</span>
                        {child.description ? <span className="text-caption text-fg-muted">{child.description}</span> : null}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg",
                  isActive(item.href) && "text-fg",
                )}
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="ms-auto flex items-center gap-1.5">
          <div className="hidden items-center gap-1 sm:flex">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          {user ? (
            <Button asChild variant="secondary" size="sm" className="ms-1 gap-2 ps-1.5">
              <Link href={user.home}>
                <Avatar name={user.name} src={user.image} size="xs" />
                <span className="hidden sm:inline">{labels.dashboard}</span>
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/sign-in">{labels.signIn}</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/apply">{labels.apply}</Link>
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={labels.openMenu}>
            <Menu />
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[86%] max-w-sm">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="mt-6 flex flex-col gap-1">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col">
                <Link href={item.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2.5 text-base font-medium text-fg hover:bg-bg-muted">
                  {item.label}
                </Link>
                {item.children?.map((child) => (
                  <Link key={child.id} href={child.href} onClick={() => setOpen(false)} className="rounded-md px-6 py-2 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg">
                    {child.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-6">
            <div className="flex items-center gap-1 sm:hidden">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
            {user ? (
              <Button asChild>
                <Link href={user.home}>{labels.dashboard}</Link>
              </Button>
            ) : (
              <>
                <Button asChild>
                  <Link href="/apply">{labels.apply}</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/sign-in">{labels.signIn}</Link>
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
