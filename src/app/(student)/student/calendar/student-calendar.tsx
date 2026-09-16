"use client";

import * as React from "react";
import Link from "next/link";
import { isSameDay, format } from "date-fns";
import { Calendar, type CalendarEvent } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export interface CalendarItem {
  id: string;
  date: string;
  title: string;
  kind: string;
  tone: "accent" | "success" | "warning" | "danger" | "purple";
  href: string;
}

export function StudentCalendar({ items }: { items: CalendarItem[] }) {
  const [selected, setSelected] = React.useState<Date>(new Date());
  const events: CalendarEvent[] = React.useMemo(() => items.map((i) => ({ id: i.id, date: new Date(i.date), title: i.title, tone: i.tone, href: i.href })), [items]);
  const dayItems = items.filter((i) => isSameDay(new Date(i.date), selected)).sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = items.filter((i) => new Date(i.date) >= new Date()).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 8);
  const toneMap = { accent: "accent", success: "success", warning: "warning", danger: "danger", purple: "purple" } as const;
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <Calendar selected={selected} onSelect={setSelected} events={events} />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-5">
        <section className="surface p-5">
          <h2 className="text-h4 mb-3">{format(selected, "EEEE, d MMMM")}</h2>
          {dayItems.length ? (
            <ul className="flex flex-col gap-2">
              {dayItems.map((i) => (
                <li key={i.id}>
                  <Link href={i.href} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm hover:border-accent">
                    <span className="w-12 shrink-0 text-caption tabular-nums text-fg-muted">{format(new Date(i.date), "HH:mm")}</span>
                    <span className="min-w-0 flex-1 truncate">{i.title}</span>
                    <Badge variant={toneMap[i.tone]}>{i.kind}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title="Nothing scheduled." description="Pick another day or check upcoming items." />
          )}
        </section>
        <section className="surface p-5">
          <h2 className="text-label mb-3 text-fg-subtle">Next up</h2>
          <ul className="flex flex-col divide-y divide-border">
            {upcoming.map((i) => (
              <li key={i.id}>
                <Link href={i.href} className={cn("flex items-center gap-3 py-2.5 text-sm hover:text-accent")}>
                  <span className="w-20 shrink-0 text-caption text-fg-muted">{format(new Date(i.date), "d MMM, HH:mm")}</span>
                  <span className="min-w-0 flex-1 truncate">{i.title}</span>
                  <span className="text-caption text-fg-subtle">{i.kind}</span>
                </Link>
              </li>
            ))}
            {!upcoming.length ? <li className="py-2 text-caption text-fg-muted">You’re all caught up.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}
