import type { Metadata } from "next";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listStudents } from "@/server/services/students";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Avatar } from "@/components/ui/avatar";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Students" };
export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; campus?: string; course?: string; status?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("students.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = sp.status === "ACTIVE" || sp.status === "SUSPENDED" || sp.status === "INVITED" ? sp.status : undefined;
  const [{ items, total, pageSize }, campuses, courses] = await Promise.all([
    listStudents({ q: sp.q, campusId: sp.campus, courseId: sp.course, status, page, pageSize: 25 }),
    prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);
  const hrefFor = (p: number) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/students?${q}`; };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Students" description={`${total.toLocaleString()} students on record.`} actions={can(user, "students.create") ? <Button asChild size="sm"><Link href="/admin/students/new"><Plus /> Add student</Link></Button> : null} />
      <FilterBar searchPlaceholder="Name, email, phone or student number" filters={[
        { key: "status", label: "statuses", options: [{ value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Suspended" }, { value: "INVITED", label: "Invited" }] },
        ...(campuses.length > 1 ? [{ key: "campus", label: "campuses", options: campuses.map((c) => ({ value: c.id, label: c.name })) }] : []),
        { key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) },
      ]} />
      {items.length ? (
        <AdminTable headers={["Student", "Contact", "Courses", "Campus", "Last login", { label: "Risk", align: "end" }]}>
          {items.map((s) => {
            const active = s.enrollments.filter((e) => e.status === "ACTIVE");
            const avg = active.length ? Math.round(active.reduce((sum, e) => sum + toNumber(e.progress?.percent ?? 0), 0) / active.length) : null;
            return (
              <Row key={s.id}>
                <Cell><Link href={`/admin/students/${s.id}`} className="flex items-center gap-2 hover:text-accent"><Avatar name={s.user.name} src={s.user.avatar?.url} size="xs" /><span><span className="block font-medium">{s.user.name}</span><span className="block text-caption text-fg-subtle">{s.studentNumber}{s.user.status !== "ACTIVE" ? ` · ${s.user.status.toLowerCase()}` : ""}</span></span></Link></Cell>
                <Cell className="text-caption"><span className="block">{s.user.email}</span><span className="block text-fg-subtle">{s.user.phone ?? "—"}</span></Cell>
                <Cell className="text-caption">{s.enrollments.length ? <><span className="block">{s.enrollments.slice(0, 2).map((e) => e.course.title).join(", ")}{s.enrollments.length > 2 ? ` +${s.enrollments.length - 2}` : ""}</span>{avg !== null ? <span className="block text-fg-subtle">{avg}% avg progress</span> : null}</> : <span className="text-fg-subtle">Not enrolled</span>}</Cell>
                <Cell muted>{s.campus?.name ?? "—"}</Cell>
                <Cell muted className="text-caption">{s.user.lastLoginAt ? relativeTime(s.user.lastLoginAt) : "never"}</Cell>
                <Cell align="end">{s.riskScores[0] ? <Badge variant={statusVariant(s.riskScores[0].level)}>{s.riskScores[0].level}</Badge> : <span className="text-caption text-fg-subtle">—</span>}</Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : (
        <EmptyState icon={<Users />} title="No students match." description="Try a different search, or add a student manually." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={hrefFor} />
    </div>
  );
}
