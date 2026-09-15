import * as React from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  time?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "accent" | "success" | "warning" | "danger";
}

const tones = {
  default: "bg-bg-muted text-fg-muted ring-border",
  accent: "bg-accent-soft text-accent ring-accent/20",
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative flex flex-col", className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 ? <span className="absolute start-[13px] top-7 h-[calc(100%-12px)] w-px bg-border" aria-hidden /> : null}
          <span
            className={cn(
              "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 [&_svg]:size-3.5",
              tones[item.tone ?? "default"],
            )}
          >
            {item.icon ?? <span className="size-2 rounded-full bg-current" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-sm font-medium text-fg">{item.title}</p>
              {item.time ? <span className="text-caption text-fg-subtle">{item.time}</span> : null}
            </div>
            {item.description ? <div className="text-body-sm text-fg-muted">{item.description}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export { Timeline };
