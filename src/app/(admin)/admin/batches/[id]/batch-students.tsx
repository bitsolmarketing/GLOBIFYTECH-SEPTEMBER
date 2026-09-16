"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus } from "lucide-react";
import { addStudentsToBatchAction, removeStudentFromBatchAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";

export function BatchStudents({ batchId, students, candidates, canManage }: { batchId: string; students: Array<{ id: string; name: string; email: string; phone: string | null; avatar: string | null; progress: number }>; candidates: Array<{ id: string; label: string }>; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [picked, setPicked] = React.useState<string[]>([]);
  const [pending, start] = React.useTransition();
  const visible = candidates.filter((c) => c.label.toLowerCase().includes(q.toLowerCase())).slice(0, 50);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between"><p className="text-h4">Students</p>{canManage ? <Button size="sm" onClick={() => setOpen(true)}><UserPlus /> Add students</Button> : null}</div>
      {students.length ? (
        <AdminTable headers={["Student", "Contact", "Course progress", { label: "", align: "end" }]}>
          {students.map((s) => (
            <Row key={s.id}>
              <Cell><Link href={`/admin/students/${s.id}`} className="flex items-center gap-2 font-medium hover:text-accent"><Avatar name={s.name} src={s.avatar} size="xs" />{s.name}</Link></Cell>
              <Cell className="text-caption text-fg-muted">{s.email}<span className="block">{s.phone ?? ""}</span></Cell>
              <Cell><div className="flex items-center gap-2"><Progress value={s.progress} size="sm" className="w-24" /><span className="text-caption tabular-nums">{s.progress}%</span></div></Cell>
              <Cell align="end">{canManage ? <ConfirmAction title={`Remove ${s.name} from this batch?`} description="Their enrollment stays active; they just leave this cohort." confirmLabel="Remove" variant="ghost" action={() => removeStudentFromBatchAction(batchId, s.id)} successMessage="Removed from batch."><UserMinus /></ConfirmAction> : null}</Cell>
            </Row>
          ))}
        </AdminTable>
      ) : <p className="surface p-6 text-body-sm text-fg-muted">No students in this batch yet.</p>}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add students</DialogTitle><DialogDescription>Only students with an active enrollment in this course who are not yet in a batch are listed.</DialogDescription></DialogHeader>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or number" />
          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {visible.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-bg-subtle">
                <Checkbox checked={picked.includes(c.id)} onCheckedChange={(v) => setPicked(v ? [...picked, c.id] : picked.filter((x) => x !== c.id))} />
                {c.label}
              </label>
            ))}
            {!visible.length ? <p className="p-3 text-caption text-fg-muted">No eligible students. Enroll them in the course first.</p> : null}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={pending} disabled={!picked.length} onClick={() => start(async () => { const res = await addStudentsToBatchAction({ batchId, studentIds: picked }); if (!res.ok) { toast.error(res.error.message); return; } toast.success(`${picked.length} student${picked.length > 1 ? "s" : ""} added.`); setPicked([]); setOpen(false); router.refresh(); })}>Add {picked.length || ""}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
