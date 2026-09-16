import type { Metadata } from "next";
import { UserCheck } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceSheet } from "@/components/studio/attendance-sheet";
import { AttendancePicker } from "./picker";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function InstructorAttendancePage({ searchParams }: { searchParams: Promise<{ batch?: string; date?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const batches = await prisma.batch.findMany({ where: { deletedAt: null, status: { in: ["OPEN", "RUNNING"] }, ...(scope.bypass ? {} : { OR: [{ instructorId: scope.instructorId ?? "" }, { course: scope.courseWhere }] }) }, orderBy: { startDate: "desc" }, select: { id: true, name: true, code: true, course: { select: { title: true } } } });
  const batchId = sp.batch && batches.some((b) => b.id === sp.batch) ? sp.batch : batches[0]?.id;
  const date = sp.date ?? new Date().toISOString().slice(0, 10);
  const sheet = batchId
    ? await prisma.batchStudent.findMany({ where: { batchId, leftAt: null }, include: { student: { select: { id: true, user: { select: { name: true, avatar: { select: { url: true } } } }, attendance: { where: { batchId, sessionDate: new Date(date) }, take: 1 } } } }, orderBy: { student: { user: { name: "asc" } } } })
    : [];
  const liveClass = batchId ? await prisma.liveClass.findFirst({ where: { batchId, startsAt: { gte: new Date(`${date}T00:00:00Z`), lt: new Date(`${date}T23:59:59Z`) } }, select: { id: true } }) : null;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Attendance" description="Mark a session manually or show a QR code for students to check in themselves." />
      {batches.length ? (
        <>
          <AttendancePicker batches={batches.map((b) => ({ id: b.id, label: `${b.name} · ${b.course.title}` }))} batchId={batchId!} date={date} />
          <AttendanceSheet key={`${batchId}-${date}`} batchId={batchId!} sessionDate={date} liveClassId={liveClass?.id ?? null} students={sheet.map((s) => ({ id: s.student.id, name: s.student.user.name, avatar: s.student.user.avatar?.url ?? null, status: (s.student.attendance[0]?.status as never) ?? null, note: s.student.attendance[0]?.note ?? null }))} />
        </>
      ) : (
        <EmptyState icon={<UserCheck />} title="No running batches." description="Attendance is tracked per batch. Ask an academic manager to open one." />
      )}
    </div>
  );
}
