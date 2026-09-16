import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listEnrollments } from "@/server/services/enrollments";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { EnrollmentForm, EnrollmentStatusMenu } from "./enrollment-form";
import { enumLabel, formatDate, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Enrollments" };
export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "COMPLETED", "PAUSED", "DROPPED", "EXPIRED"] as const;

export default async function EnrollmentsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; course?: string; batch?: string; page?: string; new?: string; student?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("enrollments.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = STATUSES.find((s) => s === sp.status);
  const manage = can(user, "enrollments.manage");
  const [{ items, total, pageSize }, courses, batches, feePlans, preselected] = await Promise.all([
    listEnrollments({ q: sp.q, status, courseId: sp.course, batchId: sp.batch, page, pageSize: 25 }),
    prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.batch.findMany({ where: { deletedAt: null, status: { in: ["PLANNED", "OPEN", "RUNNING"] } }, select: { id: true, code: true, courseId: true }, orderBy: { startDate: "desc" } }),
    manage ? prisma.feePlan.findMany({ where: { isActive: true }, select: { id: true, name: true, courseId: true, totalAmount: true, currency: true } }) : [],
    sp.student ? prisma.studentProfile.findUnique({ where: { id: sp.student }, select: { id: true, studentNumber: true, user: { select: { name: true } } } }) : null,
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Enrollments" description={`${total.toLocaleString()} enrollments.`} actions={manage ? <EnrollmentForm courses={courses} batches={batches} feePlans={feePlans.map((f) => ({ ...f, totalAmount: toNumber(f.totalAmount) }))} preselected={preselected ? { id: preselected.id, label: `${preselected.user.name} · ${preselected.studentNumber}` } : null} openInitially={sp.new === "1"} /> : null} />
      <FilterBar searchPlaceholder="Student name or email" filters={[{ key: "status", label: "statuses", options: STATUSES.map((s) => ({ value: s, label: enumLabel(s) })) }, { key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) }, { key: "batch", label: "batches", options: batches.map((b) => ({ value: b.id, label: b.code })) }]} />
      {items.length ? (
        <AdminTable headers={["Student", "Course", "Batch", "Progress", "Source", "Enrolled", "Status", { label: "", align: "end" }]}>
          {items.map((e) => (
            <Row key={e.id}>
              <Cell><Link href={`/admin/students/${e.student.id}`} className="flex items-center gap-2 hover:text-accent"><Avatar name={e.student.user.name} src={e.student.user.avatar?.url} size="xs" /><span><span className="block font-medium">{e.student.user.name}</span><span className="block text-caption text-fg-subtle">{e.student.studentNumber}</span></span></Link></Cell>
              <Cell muted>{e.course.title}</Cell>
              <Cell muted>{e.batch ? <Link href={`/admin/batches/${e.batch.id}`} className="hover:text-accent">{e.batch.code}</Link> : "—"}</Cell>
              <Cell><div className="flex items-center gap-2"><Progress value={toNumber(e.progress?.percent ?? 0)} size="sm" className="w-20" /><span className="text-caption tabular-nums">{Math.round(toNumber(e.progress?.percent ?? 0))}%</span></div>{e.progress?.lastActivityAt ? <span className="text-caption text-fg-subtle">active {relativeTime(e.progress.lastActivityAt)}</span> : null}</Cell>
              <Cell className="text-caption text-fg-muted">{enumLabel(e.source)}</Cell>
              <Cell className="text-caption text-fg-muted">{formatDate(e.createdAt)}</Cell>
              <Cell><Badge variant={statusVariant(e.status)}>{enumLabel(e.status)}</Badge></Cell>
              <Cell align="end">{manage ? <EnrollmentStatusMenu id={e.id} status={e.status} /> : null}</Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<GraduationCap />} title="No enrollments match." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && !["page", "new", "student"].includes(k)) q.set(k, v); q.set("page", String(p)); return `/admin/enrollments?${q}`; }} />
    </div>
  );
}
