import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Plus, Pencil } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listCoursesForStaff } from "@/server/services/courses";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatMoney, relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Courses" };
export const dynamic = "force-dynamic";

const STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"] as const;

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("courses.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = STATUSES.find((s) => s === sp.status);
  const [{ items, total, pageSize }, categories] = await Promise.all([
    listCoursesForStaff({ q: sp.q, status, categoryId: sp.category, page, pageSize: 25, dir: "desc" }),
    prisma.category.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { order: "asc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Courses" description={`${total} courses in the catalogue. Content is edited in the Instructor Studio.`} actions={can(user, "courses.create") ? <Button asChild size="sm"><Link href="/instructor/course-builder"><Plus /> New course</Link></Button> : null} />
      <FilterBar searchPlaceholder="Course title or slug" filters={[{ key: "status", label: "statuses", options: STATUSES.map((s) => ({ value: s, label: enumLabel(s) })) }, { key: "category", label: "categories", options: categories.map((c) => ({ value: c.id, label: c.name })) }]} />
      {items.length ? (
        <AdminTable headers={["Course", "Category", "Level", "Price", { label: "Students", align: "end" }, { label: "Modules", align: "end" }, { label: "Batches", align: "end" }, "Updated", "Status", { label: "", align: "end" }]}>
          {items.map((c) => (
            <Row key={c.id}>
              <Cell><Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-accent">{c.title}</Link><span className="block text-caption text-fg-subtle">{c.instructors.map((i) => i.instructor.user.name).join(", ") || "No instructor"}</span></Cell>
              <Cell muted>{c.category?.name ?? "—"}</Cell>
              <Cell className="text-caption text-fg-muted">{enumLabel(c.level)}<span className="block">{enumLabel(c.mode)}</span></Cell>
              <Cell className="tabular-nums">{c.discountPrice ? <><span className="text-success">{formatMoney(toNumber(c.discountPrice), c.currency)}</span><span className="block text-caption text-fg-subtle line-through">{formatMoney(toNumber(c.price), c.currency)}</span></> : formatMoney(toNumber(c.price), c.currency)}</Cell>
              <Cell align="end">{c._count.enrollments}</Cell>
              <Cell align="end">{c._count.modules}</Cell>
              <Cell align="end">{c._count.batches}</Cell>
              <Cell className="text-caption text-fg-muted">{relativeTime(c.updatedAt)}</Cell>
              <Cell><Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge></Cell>
              <Cell align="end">{can(user, "courses.update") ? <Button asChild variant="ghost" size="sm"><Link href={`/instructor/course/${c.id}`} aria-label={`Edit ${c.title}`}><Pencil /></Link></Button> : null}</Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<BookOpen />} title="No courses match." description="Build a course in the Instructor Studio, with or without the AI course builder." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/courses?${q}`; }} />
    </div>
  );
}
