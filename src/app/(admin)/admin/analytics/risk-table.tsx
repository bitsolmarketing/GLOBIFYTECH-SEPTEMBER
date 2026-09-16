"use client";

import * as React from "react";
import Link from "next/link";
import { RefreshCw, Check, ShieldAlert } from "lucide-react";
import { acknowledgeRiskAction, recomputeRiskAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/confirm-action";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/utils";

export interface RiskRow {
  id: string;
  level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  reasons: string[];
  recommendation: string | null;
  acknowledged: boolean;
  computedAt: string;
  student: { id: string; name: string; number: string; avatar: string | null };
  course: string | null;
  batch: string | null;
}

export function RiskTable({ items, page, pageSize, total, hrefFor }: { items: RiskRow[]; page: number; pageSize: number; total: number; hrefFor: (p: number) => string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <ActionButton action={recomputeRiskAction} successMessage="Risk scores recomputed." variant="outline" size="sm"><RefreshCw /> Recompute now</ActionButton>
      </div>
      {items.length ? (
        <AdminTable headers={["Student", "Course", { label: "Score", align: "end" }, "Why", "Suggested action", { label: "", align: "end" }]}>
          {items.map((r) => (
            <Row key={r.id} className={r.acknowledged ? "opacity-70" : undefined}>
              <Cell>
                <Link href={`/admin/students/${r.student.id}`} className="flex items-center gap-2 hover:text-accent">
                  <Avatar name={r.student.name} src={r.student.avatar} size="xs" />
                  <span className="font-medium">{r.student.name}</span>
                  <span className="text-caption text-fg-subtle">{r.student.number}</span>
                </Link>
              </Cell>
              <Cell muted>{r.course ?? "—"}{r.batch ? <span className="text-caption text-fg-subtle"> · {r.batch}</span> : null}</Cell>
              <Cell align="end"><Badge variant={statusVariant(r.level)}>{r.level} · {r.score}</Badge></Cell>
              <Cell><ul className="flex flex-col gap-0.5 text-caption text-fg-muted">{r.reasons.slice(0, 3).map((x) => <li key={x}>{x}</li>)}</ul></Cell>
              <Cell className="max-w-64 text-caption text-fg-muted">{r.recommendation ?? "—"}</Cell>
              <Cell align="end">
                {r.acknowledged ? <span className="inline-flex items-center gap-1 text-caption text-success"><Check className="size-3.5" /> Acknowledged</span> : <ActionButton action={() => acknowledgeRiskAction(r.id)} successMessage="Marked as handled." size="sm" variant="ghost"><Check /> Handle</ActionButton>}
              </Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<ShieldAlert />} title="No risk scores yet." description="Scores are computed nightly for every active enrollment. Run a recompute to populate them now." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={hrefFor} />
      <p className="text-caption text-fg-subtle">Last computed {items[0] ? relativeTime(new Date(items[0].computedAt)) : "never"}.</p>
    </div>
  );
}
