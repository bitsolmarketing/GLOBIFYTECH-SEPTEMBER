"use client";

import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { cn, clamp } from "@/lib/utils";

export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  value?: number;
  tone?: "accent" | "success" | "warning" | "danger" | "gradient";
  size?: "sm" | "md";
  label?: string;
}

const tones = {
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  gradient: "gradient-brand",
};

function Progress({ className, value = 0, tone = "accent", size = "md", label, ...props }: ProgressProps) {
  const v = clamp(Math.round(value), 0, 100);
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={label}
      className={cn("relative w-full overflow-hidden rounded-full bg-bg-muted", size === "sm" ? "h-1.5" : "h-2", className)}
      value={v}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tones[tone])}
        style={{ width: `${v}%` }}
      />
    </ProgressPrimitive.Root>
  );
}

export interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  tone?: "accent" | "success" | "gradient";
  children?: React.ReactNode;
  label?: string;
}

function ProgressRing({ value, size = 64, stroke = 6, className, tone = "accent", children, label }: ProgressRingProps) {
  const v = clamp(value, 0, 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  const id = React.useId();
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="55%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent-3)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--bg-muted)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone === "gradient" ? `url(#${id})` : tone === "success" ? "var(--success)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {children ?? `${Math.round(v)}%`}
      </div>
    </div>
  );
}

export { Progress, ProgressRing };
