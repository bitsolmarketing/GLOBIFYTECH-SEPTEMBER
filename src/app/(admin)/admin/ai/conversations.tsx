"use client";

import Link from "next/link";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, relativeTime } from "@/lib/utils";

export function AssistantConversations({ items, activeId, scopes }: { items: Array<{ id: string; title: string; updatedAt: string }>; activeId: string | null; scopes: string[] }) {
  return (
    <aside className="flex flex-col gap-4">
      <Button asChild variant="secondary" className="w-full"><Link href="/admin/ai"><Plus /> New conversation</Link></Button>
      <div className="surface flex flex-col p-2">
        <p className="text-label px-2 py-1 text-fg-subtle">Recent</p>
        {items.length ? (
          <ul className="flex flex-col">
            {items.map((c) => (
              <li key={c.id}>
                <Link href={`/admin/ai?c=${c.id}`} className={cn("flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-bg-subtle", activeId === c.id && "bg-accent-soft text-accent")}>
                  <MessageSquare className="mt-0.5 size-4 shrink-0" />
                  <span className="min-w-0"><span className="block truncate">{c.title}</span><span className="block text-caption text-fg-subtle">{relativeTime(new Date(c.updatedAt))}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-2 text-caption text-fg-muted">No conversations yet.</p>
        )}
      </div>
      <div className="surface p-3">
        <p className="text-label mb-2 text-fg-subtle">Your assistant can access</p>
        <div className="flex flex-wrap gap-1">{scopes.map((s) => <Badge key={s} variant="default">{s}</Badge>)}</div>
      </div>
    </aside>
  );
}
