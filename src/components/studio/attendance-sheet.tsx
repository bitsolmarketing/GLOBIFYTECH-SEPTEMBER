"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { QrCode, Save, CheckCheck } from "lucide-react";
import { markAttendanceAction, attendanceQrAction } from "@/server/actions/instructor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
const STATUSES: Array<{ value: Status; label: string; cls: string }> = [
  { value: "PRESENT", label: "P", cls: "data-[on=true]:bg-success data-[on=true]:text-white" },
  { value: "LATE", label: "L", cls: "data-[on=true]:bg-warning data-[on=true]:text-white" },
  { value: "EXCUSED", label: "E", cls: "data-[on=true]:bg-accent-3 data-[on=true]:text-white" },
  { value: "ABSENT", label: "A", cls: "data-[on=true]:bg-danger data-[on=true]:text-white" },
];

export function AttendanceSheet({ batchId, sessionDate, students, liveClassId }: { batchId: string; sessionDate: string; students: Array<{ id: string; name: string; avatar: string | null; status: Status | null; note: string | null }>; liveClassId?: string | null }) {
  const router = useRouter();
  const [rows, setRows] = React.useState(students.map((s) => ({ ...s, status: s.status ?? ("PRESENT" as Status), note: s.note ?? "" })));
  const [pending, start] = React.useTransition();
  const [qr, setQr] = React.useState<{ url: string; token: string; qrDataUrl: string } | null>(null);

  const save = () =>
    start(async () => {
      const res = await markAttendanceAction({ batchId, sessionDate: new Date(sessionDate), liveClassId: liveClassId ?? null, method: "INSTRUCTOR_PORTAL", entries: rows.map((r) => ({ studentId: r.id, status: r.status, note: r.note })) });
      if (!res.ok) { toast.error(res.error.message); return; }
      toast.success(`Attendance saved for ${rows.length} students.`);
      router.refresh();
    });

  const showQr = () =>
    start(async () => {
      const res = await attendanceQrAction(batchId, sessionDate);
      if (!res.ok) { toast.error(res.error.message); return; }
      setQr(res.data);
    });

  const counts = STATUSES.map((s) => ({ ...s, n: rows.filter((r) => r.status === s.value).length }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {counts.map((c) => <span key={c.value} className="rounded-full border border-border px-2.5 py-1 text-caption">{c.label === "P" ? "Present" : c.label === "L" ? "Late" : c.label === "E" ? "Excused" : "Absent"} {c.n}</span>)}
        <div className="ms-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setRows((r) => r.map((x) => ({ ...x, status: "PRESENT" })))}><CheckCheck /> All present</Button>
          <Button variant="secondary" size="sm" onClick={showQr} loading={pending}><QrCode /> Show QR</Button>
          <Button size="sm" onClick={save} loading={pending}><Save /> Save</Button>
        </div>
      </div>
      <div className="surface overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-subtle text-label text-fg-subtle"><tr><th className="p-3 text-start">Student</th><th className="p-3 text-start">Status</th><th className="p-3 text-start">Note</th></tr></thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="p-3"><span className="flex items-center gap-2"><Avatar name={r.name} src={r.avatar} size="xs" /> {r.name}</span></td>
                <td className="p-3">
                  <div className="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label={`${r.name} status`}>
                    {STATUSES.map((s) => (
                      <button key={s.value} type="button" role="radio" aria-checked={r.status === s.value} data-on={r.status === s.value} onClick={() => setRows((x) => x.map((y, j) => (j === i ? { ...y, status: s.value } : y)))} className={cn("px-3 py-1.5 text-caption font-semibold text-fg-muted transition-colors hover:bg-bg-muted", s.cls)} title={s.value}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="p-3"><Input value={r.note} onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} placeholder="Optional note" className="h-8" /></td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3} className="p-4 text-center text-caption text-fg-subtle">No students in this batch.</td></tr> : null}
          </tbody>
        </table>
      </div>
      <Dialog open={!!qr} onOpenChange={(v) => !v && setQr(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle>Scan to check in</DialogTitle><DialogDescription>Valid for 10 minutes. Students scan with their phone camera and are marked present.</DialogDescription></DialogHeader>
          {qr ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr.qrDataUrl} alt="Attendance QR code" width={280} height={280} className="rounded-lg border border-border bg-white p-2" />
              <p className="break-all font-mono text-caption text-fg-muted">{qr.token}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
