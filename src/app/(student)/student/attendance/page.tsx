import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { attendanceSummary } from "@/server/services/batches";
import { getSetting } from "@/server/services/settings";
import { PageHeader } from "@/components/layout/page-header";
import { ProgressRing } from "@/components/ui/progress";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QrCheckIn } from "@/components/lms/qr-check-in";
import { enumLabel, formatDate, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const [{ token }, { studentId }] = await Promise.all([searchParams, requireStudentProfile()]);
  const [memberships, warning] = await Promise.all([
    prisma.batchStudent.findMany({ where: { studentId, leftAt: null }, include: { batch: { include: { course: { select: { title: true } }, attendance: { where: { studentId }, orderBy: { sessionDate: "desc" }, take: 30 } } } } }),
    getSetting("attendance.warningPercent"),
  ]);
  const summaries = await Promise.all(memberships.map(async (m) => ({ batch: m.batch, summary: await attendanceSummary(m.batchId, studentId) })));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description={`Stay above ${warning}% to remain eligible for certification.`} />
      <section className="surface p-5">
        <h2 className="text-h4 mb-1">Check in to today's class</h2>
        <p className="mb-3 text-body-sm text-fg-muted">Scan the QR your instructor shows at the start of the session.</p>
        <QrCheckIn initialToken={token} />
      </section>
      {summaries.length ? (
        summaries.map(({ batch, summary }) => (
          <section key={batch.id} className="surface flex flex-col gap-5 p-5">
            <div className="flex flex-wrap items-center gap-5">
              <ProgressRing value={summary.percent ?? 0} size={80} stroke={8} tone={summary.percent != null && summary.percent < warning ? "accent" : "success"}>
                <span className={cn("text-sm font-semibold", summary.percent != null && summary.percent < warning && "text-warning")}>{summary.percent != null ? `${Math.round(summary.percent)}%` : "—"}</span>
              </ProgressRing>
              <div className="min-w-0 flex-1">
                <h2 className="text-h4">{batch.course.title}</h2>
                <p className="text-body-sm text-fg-muted">{batch.name} · {batch.code}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-caption">
                  {(["PRESENT", "LATE", "EXCUSED", "ABSENT"] as const).map((s) => (
                    <Badge key={s} variant={statusVariant(s)}>{enumLabel(s)} {summary.counts[s] ?? 0}</Badge>
                  ))}
                </div>
              </div>
              {summary.percent != null && summary.percent < warning ? <Badge variant="warning" className="px-3 py-1">Below {warning}%</Badge> : null}
            </div>
            {batch.attendance.length ? (
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {batch.attendance.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>{formatDate(a.sessionDate, { weekday: "short", day: "numeric", month: "short" })}</span>
                    <Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-caption text-fg-subtle">No sessions recorded yet.</p>
            )}
          </section>
        ))
      ) : (
        <EmptyState icon={<UserCheck />} title="You're not in a batch yet." description="Attendance is tracked per batch for on-campus and live online courses." />
      )}
    </div>
  );
}
