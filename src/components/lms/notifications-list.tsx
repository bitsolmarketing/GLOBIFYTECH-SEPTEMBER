"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { markNotificationsReadAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, relativeTime, enumLabel } from "@/lib/utils";

export interface NotificationRow {
  id: string;
  event: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsList({ items }: { items: NotificationRow[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const unread = items.filter((n) => !n.readAt).length;
  const markAll = () =>
    start(async () => {
      await markNotificationsReadAction();
      router.refresh();
    });
  const open = (n: NotificationRow) =>
    start(async () => {
      if (!n.readAt) await markNotificationsReadAction([n.id]);
      if (n.href) router.push(n.href);
      else router.refresh();
    });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-body-sm text-fg-muted">{unread ? `${unread} unread` : "You're all caught up."}</p>
        {unread ? (
          <Button size="sm" variant="ghost" onClick={markAll} loading={pending}>
            <CheckCheck /> Mark all read
          </Button>
        ) : null}
      </div>
      {items.length ? (
        <ul className="surface divide-y divide-border">
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} className={cn("flex w-full items-start gap-3 p-4 text-start transition-colors hover:bg-bg-subtle", !n.readAt && "bg-accent-soft/20")}>
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-medium")}>{n.title}</p>
                  <p className="text-body-sm text-fg-muted">{n.body}</p>
                  <p className="mt-1 text-caption text-fg-subtle">{enumLabel(n.event)} · {relativeTime(n.createdAt)}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Bell />} title="No notifications." description="Class reminders, grades and payments will show up here." />
      )}
      <Link href="/student/settings#notifications" className="text-caption text-fg-subtle hover:text-fg">Notification preferences</Link>
    </div>
  );
}
