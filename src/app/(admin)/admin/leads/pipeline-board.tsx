"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { changeLeadStageAction } from "@/server/actions/admin";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel, relativeTime } from "@/lib/utils";

type Stage = "NEW" | "CONTACTED" | "COUNSELLING" | "INTERESTED" | "APPLICATION" | "APPROVED" | "FEE_PENDING" | "ENROLLED" | "LOST";
interface LeadCard { id: string; name: string; phone: string | null; city: string | null; score: number; course: string | null; counsellor: { name: string; avatar: string | null } | null; nextFollowUpAt: string | null; updatedAt: string; source: string }

const STAGE_TONE: Record<Stage, string> = { NEW: "border-t-info", CONTACTED: "border-t-accent", COUNSELLING: "border-t-accent", INTERESTED: "border-t-warning", APPLICATION: "border-t-warning", APPROVED: "border-t-success", FEE_PENDING: "border-t-warning", ENROLLED: "border-t-success", LOST: "border-t-danger" };

/**
 * Kanban pipeline. Drag a card to another column to change stage (HTML5 DnD,
 * keyboard users get the same via the stage menu on the lead page).
 */
export function PipelineBoard({ columns, canUpdate }: { columns: Array<{ stage: Stage; total: number; leads: LeadCard[] }>; canUpdate: boolean }) {
  const router = useRouter();
  const [dragging, setDragging] = React.useState<string | null>(null);
  const [lost, setLost] = React.useState<{ leadId: string; name: string } | null>(null);
  const [reason, setReason] = React.useState("");
  const [pending, start] = React.useTransition();

  const move = (leadId: string, stage: Stage, lostReason?: string) =>
    start(async () => {
      const res = await changeLeadStageAction({ leadId, stage, lostReason });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(`Moved to ${enumLabel(stage)}.`);
      setLost(null);
      setReason("");
      router.refresh();
    });

  return (
    <>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
        <div className="flex min-w-max gap-3">
          {columns.map((col) => (
            <section
              key={col.stage}
              className={cn("flex w-64 shrink-0 flex-col rounded-xl border border-border border-t-4 bg-bg-subtle/60", STAGE_TONE[col.stage], dragging && "outline-dashed outline-1 outline-border-strong")}
              onDragOver={(e) => { if (canUpdate) e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/lead"); if (!id || !canUpdate) return; const from = columns.find((c) => c.leads.some((l) => l.id === id)); if (from?.stage === col.stage) return; if (col.stage === "LOST") { setLost({ leadId: id, name: from?.leads.find((l) => l.id === id)?.name ?? "lead" }); return; } move(id, col.stage); }}
            >
              <header className="flex items-center justify-between px-3 py-2"><span className="text-label">{enumLabel(col.stage)}</span><Badge>{col.total}</Badge></header>
              <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
                {col.leads.map((l) => {
                  const overdue = l.nextFollowUpAt && new Date(l.nextFollowUpAt) < new Date() && !["ENROLLED", "LOST"].includes(col.stage);
                  return (
                    <article
                      key={l.id}
                      draggable={canUpdate}
                      onDragStart={(e) => { e.dataTransfer.setData("text/lead", l.id); setDragging(l.id); }}
                      onDragEnd={() => setDragging(null)}
                      className={cn("surface cursor-grab rounded-lg p-3 text-sm shadow-xs transition hover:shadow-sm active:cursor-grabbing", dragging === l.id && "opacity-50")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/admin/leads/${l.id}`} className="font-medium hover:text-accent">{l.name}</Link>
                        <span className={cn("rounded-md px-1.5 text-caption tabular-nums", l.score >= 70 ? "bg-success-soft text-success" : l.score >= 40 ? "bg-warning-soft text-warning" : "bg-bg-muted text-fg-muted")}>{l.score}</span>
                      </div>
                      <p className="truncate text-caption text-fg-muted">{l.course ?? enumLabel(l.source)}{l.city ? ` · ${l.city}` : ""}</p>
                      <div className="mt-2 flex items-center justify-between">
                        {l.counsellor ? <span className="flex items-center gap-1 text-caption text-fg-muted"><Avatar name={l.counsellor.name} src={l.counsellor.avatar} size="xs" />{l.counsellor.name.split(" ")[0]}</span> : <span className="text-caption text-fg-subtle">Unassigned</span>}
                        <span className={cn("text-caption", overdue ? "text-danger" : "text-fg-subtle")}>{l.nextFollowUpAt ? (overdue ? "overdue" : relativeTime(new Date(l.nextFollowUpAt))) : relativeTime(new Date(l.updatedAt))}</span>
                      </div>
                    </article>
                  );
                })}
                {!col.leads.length ? <p className="px-1 py-4 text-center text-caption text-fg-subtle">Empty</p> : null}
                {col.total > col.leads.length ? <Link href={`/admin/leads?view=list&stage=${col.stage}`} className="py-1 text-center text-caption text-accent hover:underline">View all {col.total}</Link> : null}
              </div>
            </section>
          ))}
        </div>
      </div>
      <Dialog open={!!lost} onOpenChange={(o) => !o && setLost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark {lost?.name} as lost</DialogTitle><DialogDescription>Record why, so marketing can learn from it.</DialogDescription></DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Chose another institute, budget, timing…" />
          <DialogFooter><Button variant="ghost" onClick={() => setLost(null)}>Cancel</Button><Button variant="danger" loading={pending} disabled={!reason.trim()} onClick={() => lost && move(lost.leadId, "LOST", reason.trim())}>Mark lost</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
