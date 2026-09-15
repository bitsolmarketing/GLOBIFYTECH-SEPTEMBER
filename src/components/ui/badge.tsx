import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-border bg-bg-subtle text-fg-muted",
        accent: "border-transparent bg-accent-soft text-accent",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        info: "border-transparent bg-info-soft text-info",
        purple: "border-transparent bg-accent-3-soft text-accent-3",
        outline: "border-border-strong text-fg",
        inverse: "border-transparent bg-fg text-fg-inverse",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}

/** Maps common status enums to a badge variant. */
export function statusVariant(status: string): BadgeProps["variant"] {
  const s = status.toUpperCase();
  if (["PUBLISHED", "ACTIVE", "PAID", "VALID", "APPROVED", "COMPLETED", "PRESENT", "SUCCEEDED", "ENROLLED", "OPEN", "RUNNING", "HIRED", "DONE"].includes(s))
    return "success";
  if (["DRAFT", "PLANNED", "NOT_STARTED", "QUEUED"].includes(s)) return "default";
  if (["IN_REVIEW", "UNDER_REVIEW", "PENDING", "SUBMITTED", "PARTIALLY_PAID", "SCHEDULED", "CONTACTED", "COUNSELLING", "INTERESTED", "APPLICATION", "IN_PROGRESS", "LATE", "WAITLISTED", "SHORTLISTED", "INTERVIEW", "FEE_PENDING"].includes(s))
    return "warning";
  if (["REJECTED", "REVOKED", "FAILED", "OVERDUE", "SUSPENDED", "ABSENT", "LOST", "CANCELLED", "VOID", "DROPPED", "EXPIRED", "HIGH"].includes(s))
    return "danger";
  if (["LIVE", "NEW", "ISSUED", "REVISION_REQUESTED", "MEDIUM"].includes(s)) return "info";
  if (["EXCUSED", "PAUSED", "ARCHIVED", "LOW"].includes(s)) return "purple";
  return "default";
}

export { Badge, badgeVariants };
