import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma, type Prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { SimpleSelectLink } from "@/components/studio/course-filter-link";
import { relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };
export const dynamic = "force-dynamic";

export default async function InstructorStudentsPage({ searchParams }: { searchParams: Promise<{ course?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requireUser()]);
  const scope = await instructorScope(user);
  const page = Number(sp.page ?? 1) || 1;
  const pageSize = 25;
  const where: Prisma.EnrollmentWhereInput = { status: { in: ["ACTIVE", "COMPLETED"] }, course: { deletedAt: null, ...scope.courseWhere }, ...(sp.course ? { courseId: sp.course } : {}) };
  const [courses, enrollments, total] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, ...scope.courseWhere }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.enrollment.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { student: { select: { id: true, studentNumber: true, user: { select: { name: true, email: true, avatar: { select: { url: true } } } }, riskScores: { orderBy: { computedAt: "desc" }, take: 1, select: { level: true } } } }, course: { select: { title: true } }, batch: { select: { code: true } }, progress: true } }),
    prisma.enrollment.count({ where }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Students" description={`${total} enrollments across your courses.`}>
        <SimpleSelectLink base="/instructor/students" courses={courses} active={sp.course} />
      </PageHeader>
      {enrollments.length ? (
        <div className="surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-label text-fg-subtle"><tr><th className="p-3 text-start">Student</th><th className="p-3 text-start">Course</th><th className="p-3 text-start">Batch</th><th className="p-3 text-start">Progress</th><th className="p-3 text-start">Last active</th><th className="p-3 text-end">Risk</th></tr></thead>
            <tbody className="divide-y divide-border">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-bg-subtle/60">
                  <td className="p-3"><Link href={`/instructor/students/${e.student.id}`} className="flex items-center gap-2 hover:text-accent"><Avatar name={e.student.user.name} src={e.student.user.avatar?.url} size="xs" /><span className="font-medium">{e.student.user.name}</span><span className="text-caption text-fg-subtle">{e.student.studentNumber}</span></Link></td>
                  <td className="p-3 text-fg-muted">{e.course.title}</td>
                  <td className="p-3 text-fg-muted">{e.batch?.code ?? "—"}</td>
                  <td className="p-3"><div className="flex items-center gap-2"><Progress value={toNumber(e.progress?.percent ?? 0)} size="sm" className="w-24" /><span className="text-caption tabular-nums">{Math.round(toNumber(e.progress?.percent ?? 0))}%</span></div></td>
                  <td className="p-3 text-fg-muted">{e.progress?.lastActivityAt ? relativeTime(e.progress.lastActivityAt) : "never"}</td>
                  <td className="p-3 text-end">{e.student.riskScores[0] ? <Badge variant={statusVariant(e.student.riskScores[0].level)}>{e.student.riskScores[0].level}</Badge> : <span className="text-caption text-fg-subtle">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Users />} title="No students yet." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => `/instructor/students?page=${p}${sp.course ? `&course=${sp.course}` : ""}`} />
    </div>
  );
}
