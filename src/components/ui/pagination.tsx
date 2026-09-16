// Deliberately not a client component: it renders plain links and is used from
// server components, which cannot pass the hrefFor function across the
// server/client boundary. It still works inside client components, where the
// onPageChange handler applies.

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  /** Builds the href for a page (server-driven lists). */
  hrefFor?: (page: number) => string;
  /** Or a client handler. */
  onPageChange?: (page: number) => void;
  className?: string;
}

function range(current: number, totalPages: number): Array<number | "…"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set<number>([1, totalPages, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i]!;
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("…");
    out.push(p);
  }
  return out;
}

function Pagination({ page, pageSize, total, hrefFor, onPageChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const item = (p: number, label: React.ReactNode, active = false, ariaLabel?: string) => {
    const cls = cn(buttonVariants({ variant: active ? "secondary" : "ghost", size: "sm" }), "min-w-8 px-2", active && "border-accent text-accent");
    const disabled = p < 1 || p > totalPages;
    if (hrefFor && !disabled)
      return (
        <Link key={`${p}-${String(label)}`} href={hrefFor(p)} className={cls} aria-current={active ? "page" : undefined} aria-label={ariaLabel}>
          {label}
        </Link>
      );
    // Link mode renders on the server, where an onClick handler is not allowed,
    // so an out-of-range arrow becomes inert markup rather than a button.
    if (hrefFor)
      return (
        <span key={`${p}-${String(label)}`} className={cn(cls, "pointer-events-none opacity-50")} aria-hidden aria-label={ariaLabel}>
          {label}
        </span>
      );
    return (
      <button
        key={`${p}-${String(label)}`}
        type="button"
        className={cls}
        disabled={disabled}
        onClick={() => onPageChange?.(p)}
        aria-current={active ? "page" : undefined}
        aria-label={ariaLabel}
      >
        {label}
      </button>
    );
  };

  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <p className="text-body-sm text-fg-muted">
        Showing <span className="font-medium text-fg">{from}–{to}</span> of <span className="font-medium text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        {item(page - 1, <ChevronLeft className="size-4" />, false, "Previous page")}
        {range(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-fg-subtle">
              …
            </span>
          ) : (
            item(p, p, p === page)
          ),
        )}
        {item(page + 1, <ChevronRight className="size-4" />, false, "Next page")}
      </div>
    </nav>
  );
}

export { Pagination };
