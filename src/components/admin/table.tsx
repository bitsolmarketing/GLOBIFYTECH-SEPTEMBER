import * as React from "react";
import { cn } from "@/lib/utils";

/** Server-rendered list table used across the admin surface. */
export function AdminTable({ headers, children, className, dense }: { headers: Array<string | { label: string; align?: "start" | "end"; className?: string }>; children: React.ReactNode; className?: string; dense?: boolean }) {
  return (
    <div className={cn("surface overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="bg-bg-subtle text-label text-fg-subtle">
          <tr>
            {headers.map((h, i) => {
              const def = typeof h === "string" ? { label: h } : h;
              return <th key={i} className={cn(dense ? "px-3 py-2" : "p-3", def.align === "end" ? "text-end" : "text-start", "font-medium whitespace-nowrap", def.className)}>{def.label}</th>;
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("transition-colors hover:bg-bg-subtle/60", className)}>{children}</tr>;
}

export function Cell({ children, className, align, muted }: { children?: React.ReactNode; className?: string; align?: "start" | "end"; muted?: boolean }) {
  return <td className={cn("p-3 align-middle", align === "end" && "text-end", muted && "text-fg-muted", className)}>{children ?? <span className="text-fg-subtle">-</span>}</td>;
}
