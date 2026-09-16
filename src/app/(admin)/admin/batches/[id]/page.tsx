import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, Video } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { getBatch, batchAttendanceMatrix } from "@/server/services/batches";
import { batchFormOptions } from "@/server/queries/batch-options";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { BatchForm } from "@/components/admin/batch-form";
import { BatchStudents } from "./batch-students";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { enumLabel, formatDate, formatDateTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Batch" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BatchDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, sp, user] = await Promise.all([params, searchParams, requirePermission("batches.read")]);
  const tab = sp.tab === "edit" || sp.tab === "attendance" ? sp.tab : "students";
  const [b, options, matrix, candidates] = await Promise.all([
    getBatch(id),
    tab === "edit" ? batchFormOptions() : null,
    tab === "attendance" ? batchAttendanceMatrix(id) : null,
    can(user, "enrollments.manage") ? prisma.enrollment.findMany({ where: { status: "ACTIVE", batchId: null }, select: { student: { select: { id: true, studentNumber: true, user: { select: { name: true } } } } }, orderBy: { createdAt: "desc" }, take: 200 }) : [],
  ]);
  const enrolledCandidates = candidates.filter((c) => !b.students.some((s) => s.studentId === c.student.id)).map((c) => ({ id: c.student.id, label: `${c.student.user.name} · ${c.student.studentNumber}` }));
  const tabLink = (t: string, label: string) => <Link href={`/admin/batches/${id}${t === "students" ? "" : `?tab=${t}`}`} className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === t ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>{label}</Link>;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: "Batches", href: "/admin/batches" }, { label: b.code }]}
        title={`${b.code} · ${b.name}`}
        description={`${b.course.title} · ${enumLabel(b.mode)} · ${formatDate(b.startDate)}${b.endDate ? ` → ${formatDate(b.endDate)}` : ""}${b.campus ? ` · ${b.campus.name}${b.classroom ? `, ${b.classroom.name}` : ""}` : ""}`}
        actions={<div className="flex items-center gap-2"><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge>{can(user, "attendance.mark") ? <Button asChild size="sm" variant="outline"><Link href={`/instructor/attendance?batch=${b.id}`}><ClipboardCheck /> Mark attendance</Link></Button> : null}</div>}
      />
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="surface p-4"><p className="text-caption text-fg-muted">Students</p><p className="text-h3 tabular-nums">{b.students.length}<span className="text-body-sm text-fg-subtle">/{b.capacity}</span></p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Instructor</p><p className="truncate text-body font-medium">{b.instructor ? <Link href={`/admin/instructors/${b.instructor.id}`} className="hover:text-accent">{b.instructor.user.name}</Link> : "Unassigned"}</p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Schedule</p><p className="text-body-sm">{b.schedule.length ? b.schedule.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}–${s.endTime}`).join(" · ") : "No fixed schedule"}</p></div>
        <div className="surface p-4"><p className="text-caption text-fg-muted">Attendance records</p><p className="text-h3 tabular-nums">{b._count.attendance}</p></div>
      </div>
      <nav className="flex w-full gap-1 border-b border-border">{tabLink("students", "Students")}{tabLink("attendance", "Attendance")}{can(user, "batches.manage") ? tabLink("edit", "Edit batch") : null}</nav>

      {tab === "students" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <BatchStudents batchId={b.id} canManage={can(user, "enrollments.manage")} candidates={enrolledCandidates} students={b.students.map((s) => ({ id: s.studentId, name: s.student.user.name, email: s.student.user.email, phone: s.student.user.phone, avatar: s.student.user.avatar?.url ?? null, progress: Math.round(toNumber(s.student.enrollments.find((e) => e.courseId === b.courseId)?.progress?.percent ?? 0)) }))} />
          </div>
          <aside>
            <p className="text-h4 mb-3">Live classes</p>
            {b.liveClasses.length ? <ul className="surface divide-y divide-border">{b.liveClasses.map((c) => <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm"><span className="min-w-0"><span className="block truncate font-medium"><Video className="me-1 inline size-3.5 text-accent" />{c.title}</span><span className="block text-caption text-fg-subtle">{formatDateTime(c.startsAt)}</span></span><Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge></li>)}</ul> : <p className="surface p-4 text-caption text-fg-muted">No live classes scheduled.</p>}
          </aside>
        </div>
      ) : null}

      {tab === "attendance" && matrix ? (
        matrix.dates.length ? (
          <AdminTable headers={["Student", ...matrix.dates.map((d) => formatDate(new Date(d))), { label: "Rate", align: "end" }]} dense>
            {matrix.rows.map((r) => (
              <Row key={r.studentId}>
                <Cell className="whitespace-nowrap font-medium"><Link href={`/admin/students/${r.studentId}`} className="hover:text-accent">{r.name}</Link></Cell>
                {matrix.dates.map((d) => { const s = r.byDate[d]; return <Cell key={d} className="text-center"><span className={`inline-block size-2.5 rounded-full ${s === "PRESENT" ? "bg-success" : s === "LATE" ? "bg-warning" : s === "EXCUSED" ? "bg-info" : s === "ABSENT" ? "bg-danger" : "bg-border"}`} title={s ?? "Not marked"} /></Cell>; })}
                <Cell align="end" className={r.percent !== null && r.percent < 75 ? "text-warning" : undefined}>{r.percent !== null ? `${r.percent}%` : "—"}</Cell>
              </Row>
            ))}
          </AdminTable>
        ) : <p className="surface p-6 text-body-sm text-fg-muted">No attendance recorded for this batch yet.</p>
      ) : null}

      {tab === "edit" && options ? (
        <div className="surface p-6">
          <BatchForm id={b.id} {...options} initial={{ code: b.code, name: b.name, courseId: b.courseId, campusId: b.campusId ?? "", classroomId: b.classroomId ?? "", instructorId: b.instructorId ?? "", mode: b.mode, capacity: b.capacity, startDate: b.startDate.toISOString().slice(0, 10), endDate: b.endDate ? b.endDate.toISOString().slice(0, 10) : "", status: b.status, timezone: b.timezone, schedule: b.schedule.map((s) => ({ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime })) }} />
        </div>
      ) : null}
    </div>
  );
}
