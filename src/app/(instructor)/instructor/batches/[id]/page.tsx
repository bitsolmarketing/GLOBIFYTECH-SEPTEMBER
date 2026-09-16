import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserCheck, Video, Megaphone } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { getBatch, batchAttendanceMatrix } from "@/server/services/batches";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnnouncementForm } from "@/components/studio/live-class-forms";
import { enumLabel, formatDate, formatDateTime, toNumber, cn } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Batch" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const cell: Record<string, string> = { PRESENT: "bg-success", LATE: "bg-warning", EXCUSED: "bg-accent-3", ABSENT: "bg-danger" };

export default async function InstructorBatchPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const scope = await instructorScope(user);
  await scope.assertBatch(id).catch(() => notFound());
  const batch = await getBatch(id).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!batch) notFound();
  const matrix = await batchAttendanceMatrix(id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader breadcrumbs={[{ label: "Batches", href: "/instructor/batches" }, { label: batch.name }]} title={batch.name} description={`${batch.course.title} · ${batch.code} · ${enumLabel(batch.mode)} · ${batch.campus?.name ?? "Online"}${batch.classroom ? ` · ${batch.classroom.name}` : ""}`} actions={<><Badge variant={statusVariant(batch.status)}>{enumLabel(batch.status)}</Badge><Button asChild variant="secondary" size="sm"><Link href={`/instructor/attendance?batch=${batch.id}`}><UserCheck /> Mark attendance</Link></Button><Button asChild variant="secondary" size="sm"><Link href={`/instructor/live-classes?new=1&batch=${batch.id}`}><Video /> Schedule class</Link></Button></>} />
      <div className="grid gap-3 text-body-sm sm:grid-cols-4">
        <div className="surface p-4"><p className="text-caption text-fg-muted">Dates</p><p className="font-medium">{formatDate(batch.startDate)}{batch.endDate ? ` – ${formatDate(batch.endDate)}` : ""}</p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Schedule</p><p className="font-medium">{batch.schedule.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}`).join(", ") || "TBA"}</p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Seats</p><p className="font-medium">{batch.students.length}/{batch.capacity}</p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Sessions recorded</p><p className="font-medium">{matrix.dates.length}</p></div>
      </div>
      <Tabs defaultValue="students">
        <TabsList><TabsTrigger value="students">Students</TabsTrigger><TabsTrigger value="attendance">Attendance</TabsTrigger><TabsTrigger value="classes">Live classes</TabsTrigger><TabsTrigger value="announce">Announce</TabsTrigger></TabsList>
        <TabsContent value="students">
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-label text-fg-subtle"><tr><th className="p-3 text-start">Student</th><th className="p-3 text-start">Contact</th><th className="p-3 text-start">Progress</th><th className="p-3 text-end">Joined</th></tr></thead>
              <tbody className="divide-y divide-border">
                {batch.students.map((bs) => {
                  const prog = bs.student.enrollments.find((e) => e.courseId === batch.courseId)?.progress;
                  return (
                    <tr key={bs.studentId} className="hover:bg-bg-subtle/60">
                      <td className="p-3"><Link href={`/instructor/students/${bs.studentId}`} className="flex items-center gap-2 hover:text-accent"><Avatar name={bs.student.user.name} src={bs.student.user.avatar?.url} size="xs" />{bs.student.user.name}</Link></td>
                      <td className="p-3 text-fg-muted">{bs.student.user.phone ?? bs.student.user.email}</td>
                      <td className="p-3"><div className="flex items-center gap-2"><Progress value={toNumber(prog?.percent ?? 0)} size="sm" className="w-24" /><span className="text-caption tabular-nums">{Math.round(toNumber(prog?.percent ?? 0))}%</span></div></td>
                      <td className="p-3 text-end text-fg-muted">{formatDate(bs.joinedAt)}</td>
                    </tr>
                  );
                })}
                {!batch.students.length ? <tr><td colSpan={4} className="p-4 text-center text-caption text-fg-subtle">No students in this batch yet.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="attendance">
          {matrix.dates.length ? (
            <div className="surface overflow-x-auto">
              <table className="text-sm">
                <thead><tr><th className="sticky start-0 bg-surface p-3 text-start text-label text-fg-subtle">Student</th>{matrix.dates.map((d) => <th key={d} className="p-2 text-caption font-normal text-fg-subtle">{formatDate(d, { day: "numeric", month: "short" })}</th>)}<th className="p-3 text-end text-label text-fg-subtle">%</th></tr></thead>
                <tbody className="divide-y divide-border">
                  {matrix.rows.map((r) => (
                    <tr key={r.studentId}>
                      <td className="sticky start-0 bg-surface p-3 font-medium">{r.name}</td>
                      {matrix.dates.map((d) => <td key={d} className="p-2 text-center"><span title={r.byDate[d] ?? "—"} className={cn("inline-block size-4 rounded", r.byDate[d] ? cell[r.byDate[d]!] : "bg-bg-muted")} /></td>)}
                      <td className="p-3 text-end tabular-nums">{r.percent ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-body-sm text-fg-muted">No attendance recorded yet. Use “Mark attendance” after each session.</p>
          )}
        </TabsContent>
        <TabsContent value="classes">
          <ul className="surface divide-y divide-border">
            {batch.liveClasses.map((c) => <li key={c.id} className="flex items-center justify-between gap-3 p-4 text-sm"><div><p className="font-medium">{c.title}</p><p className="text-caption text-fg-muted">{formatDateTime(c.startsAt)}</p></div><Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge></li>)}
            {!batch.liveClasses.length ? <li className="p-4 text-caption text-fg-subtle">No live classes yet.</li> : null}
          </ul>
        </TabsContent>
        <TabsContent value="announce">
          <div className="surface max-w-2xl p-6"><p className="mb-3 inline-flex items-center gap-2 text-h4"><Megaphone className="size-4 text-accent" /> Announcement to this batch</p><AnnouncementForm batchId={batch.id} courseId={batch.courseId} /></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
