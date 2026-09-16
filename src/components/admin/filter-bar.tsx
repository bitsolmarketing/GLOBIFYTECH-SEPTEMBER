"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterDef {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * URL-driven filter bar for admin lists. Every change writes to the query
 * string so views are shareable and server components re-render.
 */
export function FilterBar({ searchKey = "q", searchPlaceholder = "Search", filters = [], className, children }: { searchKey?: string; searchPlaceholder?: string; filters?: FilterDef[]; className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = React.useState(params.get(searchKey) ?? "");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = React.useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || v === "all") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? pathname + "?" + qs : pathname);
    },
    [params, pathname, router],
  );

  const active = filters.filter((f) => params.get(f.key)).length + (params.get(searchKey) ? 1 : 0);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative min-w-52 flex-1">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (timer.current) clearTimeout(timer.current);
            const value = e.target.value.trim();
            timer.current = setTimeout(() => push({ [searchKey]: value || null }), 350);
          }}
          placeholder={searchPlaceholder}
          className="ps-9"
          aria-label="Search"
        />
      </div>
      {filters.map((f) => (
        <SimpleSelect key={f.key} size="sm" value={params.get(f.key) ?? "all"} onValueChange={(v) => push({ [f.key]: v })} options={[{ value: "all", label: "All " + f.label.toLowerCase() }, ...f.options]} className="w-44" />
      ))}
      {children}
      {active > 0 ? (
        <Button variant="ghost" size="sm" onClick={() => { setQ(""); router.replace(pathname); }}>
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}
