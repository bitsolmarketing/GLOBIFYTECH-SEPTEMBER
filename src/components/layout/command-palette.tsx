"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Loader2 } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { NavIcon } from "./nav-icon";
import type { ShellNavGroup } from "./app-shell";

export interface CommandDef {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  /** Destructive commands always confirm before running. */
  destructive?: boolean;
  keywords?: string[];
  icon?: string;
}

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  groups,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  commands: CommandDef[];
  groups: ShellNavGroup[];
  placeholder: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const term = query.trim();
  // Derived rather than stored, so a short query never shows stale results.
  const results = term.length < 2 ? [] : hits;

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) {
          const body = (await res.json()) as { data: SearchHit[] };
          setHits(body.data);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
      setHits([]);
    }
    onOpenChange(next);
  };

  const go = (href: string) => {
    handleOpenChange(false);
    router.push(href);
  };

  const run = (cmd: CommandDef) => {
    if (cmd.destructive && !window.confirm(`${cmd.label}?\n\nThis action cannot be undone.`)) return;
    if (cmd.href) go(cmd.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange} title={placeholder}>
      <CommandInput placeholder={placeholder} value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>{loading ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Nothing matches. Try a different word."}</CommandEmpty>
        {results.length ? (
          <CommandGroup heading="Results">
            {results.map((h) => (
              <CommandItem key={`${h.type}-${h.id}`} value={`${h.title} ${h.subtitle ?? ""} ${h.type}`} onSelect={() => go(h.href)}>
                <ArrowRight />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{h.title}</span>
                  {h.subtitle ? <span className="truncate text-caption text-fg-subtle">{h.subtitle}</span> : null}
                </span>
                <CommandShortcut className="capitalize">{h.type}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {commands.length ? (
          <CommandGroup heading="Commands">
            {commands.map((c) => (
              <CommandItem key={c.id} value={`${c.label} ${c.keywords?.join(" ") ?? ""}`} onSelect={() => run(c)}>
                {c.icon ? <NavIcon name={c.icon} /> : <CornerDownLeft />}
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{c.label}</span>
                  {c.hint ? <span className="truncate text-caption text-fg-subtle">{c.hint}</span> : null}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Go to">
          {groups.flatMap((g) =>
            g.items.map((item) => (
              <CommandItem key={item.key} value={`${item.label} ${g.label}`} onSelect={() => go(item.href)}>
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
                <CommandShortcut>{g.label}</CommandShortcut>
              </CommandItem>
            )),
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
