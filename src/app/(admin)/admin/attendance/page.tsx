import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Video } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getSetting } from "@/server/services/settings";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  await requirePermission("attendance.read");
  const since = new Date(Date.now() - 30 * 86400000);
  const [batches, warning, upcoming, lowStudents] = await Promise.all([
    prisma.batch.findMany({ where: { deletedAt: null, status: { in: ["OPEN", "RUNNING"] } }, orderBy: { startDate: "desc" }, include: { course: { select: { title: true } }, instructor: { select: { user: { select: { name: true } } } }, attendance: { where: { sessionDate: { gte: since } }, select: { status: true, sessionDate: true } }, _count: { select: { students: { where: { leftAt: null } } } } } }),
    getSetting("attendance.warningPercent"),
    prisma.liveClass.findMany({ where: { status: "SCHEDULED", startsAt: { gte: new Date(), lte: new Date(Date.now() + 7 * 86400000) } }, orderBy: { startsAt: "asc" }, take: 10, include: { course: { select: { title: true } }, batch: { select: { id: true, code: true } } } }),
    prisma.attendance.groupBy({ by: ["studentId", "batchId"], where: { sessionDate: { gte: since } }, _count: { _all: true } }),
  ]);
  const absent = await prisma.attendance.groupBy({ by: ["studentId", "batchId"], where: { sessionDate: { gte: since }, status: "ABSENT" }, _count: { _all: true } });
  const low = lowStudents
    .map((r) => { const a = absent.find((x) => x.studentId === r.studentId && x.batchId === r.batchId)?._count._all ?? 0; return { ...r, percent: Math.round(((r._count._all - a) / r._count._all) * 100) }; })
    .filter((r) => r._count._all >= 3 && r.percent < warning)
    .sort((a, b) => a.percent - b.percent)
    .slice(0, 15);
  const lowDetails = low.length ? await prisma.studentProfile.findMany({ where: { id: { in: low.map((l) => l.studentId) } }, select: { id: true, studentNumber: true, user: { select: { name: true } } } }) : [];
  const batchCodes = new Map(batches.map((b) => [b.id, b.code]));
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Attendance" description="Institute-wide attendance for running batches over the last 30 days." actions={<Button asChild size="sm"><Link href="/instructor/attendance"><ClipboardCheck /> Mark attendance</Link></Button>} />
      <section>
        <p className="text-h4 mb-3">Running batches</p>
        {batches.length ? (
          <AdminTable headers={["Batch", "Course", "Instructor", { label: "Students", align: "end" }, "Sessions (30d)", "Attendance rate", "Status"]}>
            {batches.map((b) => {
              const total = b.attendance.length;
              const present = b.attendance.filter((a) => a.status !== "ABSENT").length;
              const rate = total ? Math.round((present / total) * 100) : null;
              const sessions = new Set(b.attendance.map((a) => a.sessionDate.toISOString().slice(0, 10))).size;
              return (
                <Row key={b.id}>
                  <Cell><Link href={`/admin/batches/${b.id}?tab=attendance`} className="font-medium hover:text-accent">{b.code}</Link></Cell>
                  <Cell muted>{b.course.title}</Cell>
                  <Cell muted>{b.instructor?.user.name ?? "—"}</Cell>
                  <Cell align="end">{b._count.students}</Cell>
                  <Cell className="text-caption text-fg-muted">{sessions}</Cell>
                  <Cell>{rate !== null ? <div className="flex items-center gap-2"><Progress value={rate} size="sm" className="w-24" tone={rate < warning ? "warning" : "success"} /><span className="text-caption tabular-nums">{rate}%</span></div> : <span className="text-caption text-fg-subtle">No sessions yet</span>}</Cell>
                  <Cell><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge></Cell>
                </Row>
              );
            })}
          </AdminTable>
        ) : <EmptyState icon={<ClipboardCheck />} title="No running batches." compact />}
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-h4 mb-3">Below {warning}% attendance</p>
          {low.length ? (
            <ul className="surface divide-y divide-border">
              {low.map((l) => { const s = lowDetails.find((d) => d.id === l.studentId); return <li key={`${l.studentId}-${l.batchId}`} className="flex items-center justify-between px-4 py-2 text-sm"><span><Link href={`/admin/students/${l.studentId}`} className="font-medium hover:text-accent">{s?.user.name ?? "Student"}</Link><span className="block text-caption text-fg-subtle">{s?.studentNumber} · {batchCodes.get(l.batchId) ?? "batch"} · {l._count._all} sessions</span></span><Badge variant="warning">{l.percent}%</Badge></li>; })}
            </ul>
          ) : <p className="surface p-4 text-caption text-fg-muted">Everyone with 3+ sessions is above the warning threshold.</p>}
        </div>
        <div>
          <p className="text-h4 mb-3">Upcoming live classes</p>
          {upcoming.length ? (
            <ul className="surface divide-y divide-border">
              {upcoming.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm"><span className="min-w-0"><span className="block truncate font-medium"><Video className="me-1 inline size-3.5 text-accent" />{c.title}</span><span className="block text-caption text-fg-subtle">{c.course.title}{c.batch ? ` · ${c.batch.code}` : ""}</span></span><span className="shrink-0 text-caption text-fg-muted">{formatDateTime(c.startsAt)}</span></li>)}
            </ul>
          ) : <p className="surface p-4 text-caption text-fg-muted">Nothing scheduled in the next 7 days. Today is {formatDate(new Date())}.</p>}
        </div>
      </section>
    </div>
  );
}
