import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listBatches } from "@/server/services/batches";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Batches" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function BatchesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; course?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("batches.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = ["PLANNED", "OPEN", "RUNNING", "COMPLETED", "CANCELLED"].includes(sp.status ?? "") ? (sp.status as "PLANNED") : undefined;
  const [{ items, total, pageSize }, courses] = await Promise.all([
    listBatches({ q: sp.q, status, courseId: sp.course, page, pageSize: 25 }),
    prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Batches" description="Cohorts of up to 18 students with schedules, classrooms and instructors." actions={can(user, "batches.manage") ? <Button asChild size="sm"><Link href="/admin/batches/new"><Plus /> New batch</Link></Button> : null} />
      <FilterBar searchPlaceholder="Batch code or name" filters={[{ key: "status", label: "statuses", options: ["PLANNED", "OPEN", "RUNNING", "COMPLETED", "CANCELLED"].map((s) => ({ value: s, label: enumLabel(s) })) }, { key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) }]} />
      {items.length ? (
        <AdminTable headers={["Batch", "Course", "Instructor", "Schedule", "Dates", { label: "Seats", align: "end" }, "Status"]}>
          {items.map((b) => (
            <Row key={b.id}>
              <Cell><Link href={`/admin/batches/${b.id}`} className="font-medium hover:text-accent">{b.code}</Link><span className="block text-caption text-fg-subtle">{b.name}</span></Cell>
              <Cell muted>{b.course.title}</Cell>
              <Cell muted>{b.instructor ? <Link href={`/admin/instructors/${b.instructor.id}`} className="hover:text-accent">{b.instructor.user.name}</Link> : "—"}</Cell>
              <Cell className="text-caption">{b.schedule.length ? b.schedule.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}`).join(", ") : enumLabel(b.mode)}{b.classroom ? <span className="block text-fg-subtle">{b.campus?.name} · {b.classroom.name}</span> : null}</Cell>
              <Cell className="text-caption text-fg-muted">{formatDate(b.startDate)}{b.endDate ? ` → ${formatDate(b.endDate)}` : ""}</Cell>
              <Cell align="end"><span className={b._count.students >= b.capacity ? "text-warning" : undefined}>{b._count.students}/{b.capacity}</span></Cell>
              <Cell><Badge variant={statusVariant(b.status)}>{enumLabel(b.status)}</Badge></Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<Layers />} title="No batches yet." description="Create a batch to schedule classes and track attendance." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/batches?${q}`; }} />
    </div>
  );
}
