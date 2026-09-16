"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ReportControls({ reports, active, from, to, total }: { reports: Array<{ key: string; label: string; description: string }>; active: string; from: string; to: string; total: number }) {
  const router = useRouter();
  const [range, setRange] = React.useState({ from, to });
  const apply = (key = active) => {
    const q = new URLSearchParams({ report: key });
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    router.push(`/admin/reports?${q}`);
  };
  const exportHref = (format: string) => {
    const q = new URLSearchParams({ report: active, format });
    if (range.from) q.set("from", range.from);
    if (range.to) q.set("to", range.to);
    return `/api/admin/reports/export?${q}`;
  };
  const current = reports.find((r) => r.key === active);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {reports.map((r) => (
          <button key={r.key} type="button" onClick={() => apply(r.key)} className={cn("surface surface-hover flex flex-col items-start gap-1 p-4 text-start transition", r.key === active && "border-accent ring-2 ring-accent/20")}>
            <span className="text-body font-semibold">{r.label}</span>
            <span className="text-caption text-fg-muted">{r.description}</span>
          </button>
        ))}
      </div>
      <div className="surface flex flex-wrap items-end gap-3 p-4">
        <div className="grid gap-1"><Label htmlFor="rep-from">From</Label><Input id="rep-from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className="w-44" /></div>
        <div className="grid gap-1"><Label htmlFor="rep-to">To</Label><Input id="rep-to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className="w-44" /></div>
        <Button variant="secondary" onClick={() => apply()}>Apply range</Button>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <span className="text-caption text-fg-muted">{current?.label}: {total.toLocaleString()} rows</span>
          <Button asChild variant="outline" size="sm" disabled={!total}><a href={exportHref("csv")} download><FileText /> CSV</a></Button>
          <Button asChild variant="outline" size="sm" disabled={!total}><a href={exportHref("xlsx")} download><FileSpreadsheet /> Excel</a></Button>
          <Button asChild size="sm" disabled={!total}><a href={exportHref("pdf")} download><FileType /> PDF</a></Button>
          <Download className="size-4 text-fg-subtle" aria-hidden />
        </div>
      </div>
    </div>
  );
}
