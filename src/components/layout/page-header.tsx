import * as React from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

export interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, eyebrow, actions, breadcrumbs, className, children }: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          {eyebrow ? <p className="text-label text-accent">{eyebrow}</p> : null}
          <h1 className="text-h2 text-fg">{title}</h1>
          {description ? <p className="max-w-2xl text-body text-fg-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function SectionHeader({ title, description, actions, className }: { title: string; description?: string; actions?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-h4 text-fg">{title}</h2>
        {description ? <p className="text-body-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
