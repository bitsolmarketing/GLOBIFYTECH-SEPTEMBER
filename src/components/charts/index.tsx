"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { cn } from "@/lib/utils";

/**
 * Restrained chart wrappers on Recharts. One accent series by default, muted
 * grid, tokens for colours so light/dark stay consistent. No 3D, no rainbows.
 */
const COLORS = ["var(--accent)", "var(--accent-2)", "var(--accent-3)", "var(--success)", "var(--warning)"];

function ChartTooltip({ active, payload, label, format }: { active?: boolean; payload?: Array<{ value: number; name: string; color?: string }>; label?: string; format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-caption shadow-md">
      <p className="mb-1 font-medium text-fg">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-fg-muted">
          <span className="size-2 rounded-full" style={{ background: p.color }} /> {p.name}: <span className="tabular-nums text-fg">{format ? format(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface SeriesPoint {
  date: string;
  value: number;
}

const shortDate = (d: string) => {
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en", { day: "numeric", month: "short" });
};

export function TrendChart({ data, height = 220, kind = "area", format, className, name = "Value", color = COLORS[0] }: { data: SeriesPoint[]; height?: number; kind?: "area" | "line"; format?: (v: number) => string; className?: string; name?: string; color?: string }) {
  const id = React.useId();
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (format ? format(v) : String(v))} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--border-strong)" }} />
            <Area type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (format ? format(v) : String(v))} />
            <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: "var(--border-strong)" }} />
            <Line type="monotone" dataKey="value" name={name} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, height = 220, format, className, name = "Value", labelKey = "label", horizontal, color = COLORS[0] }: { data: Array<Record<string, string | number>>; height?: number; format?: (v: number) => string; className?: string; name?: string; labelKey?: string; horizontal?: boolean; color?: string }) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={!horizontal} vertical={horizontal} stroke="var(--border)" strokeDasharray="3 3" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} tickFormatter={(v) => (format ? format(v) : String(v))} />
              <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} width={110} />
            </>
          ) : (
            <>
              <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => (format ? format(v) : String(v))} />
            </>
          )}
          <Tooltip content={<ChartTooltip format={format} />} cursor={{ fill: "var(--bg-muted)" }} />
          <Bar dataKey="value" name={name} fill={color} radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Funnel as ordered horizontal bars with a conversion label per step. */
export function FunnelChart({ steps, className, height = 240 }: { steps: Array<{ stage: string; value: number }>; className?: string; height?: number }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
          <XAxis type="number" hide domain={[0, max]} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "var(--fg-subtle)" }} axisLine={false} tickLine={false} width={100} tickFormatter={(v: string) => v.replace("_", " ").toLowerCase()} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--bg-muted)" }} />
          <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: "var(--fg-muted)" }}>
            {steps.map((_, i) => (
              <Cell key={i} fill={COLORS[Math.min(i, COLORS.length - 1)]} fillOpacity={1 - i * 0.08} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Weekly activity heatmap (7 columns × N weeks). */
export function Heatmap({ data, className }: { data: SeriesPoint[]; className?: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className={cn("grid grid-cols-7 gap-1", className)} role="img" aria-label="Activity heatmap">
      {data.map((d) => (
        <div key={d.date} title={`${shortDate(d.date)}: ${d.value}`} className="aspect-square rounded-[4px]" style={{ background: d.value ? `color-mix(in oklab, var(--accent) ${Math.max(15, Math.round((d.value / max) * 100))}%, var(--bg-muted))` : "var(--bg-muted)" }} />
      ))}
    </div>
  );
}
