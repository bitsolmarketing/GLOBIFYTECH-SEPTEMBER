import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listApplications } from "@/server/services/applications";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { enumLabel, formatDateTime, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

const STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "WAITLISTED", "REJECTED", "ENROLLED"] as const;

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; course?: string; page?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("applications.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = STATUSES.find((s) => s === sp.status);
  const [{ items, total, pageSize }, courses, counts] = await Promise.all([
    listApplications({ q: sp.q, status, courseId: sp.course, page, pageSize: 25 }),
    prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.application.groupBy({ by: ["status"], where: { NOT: { status: "DRAFT" } }, _count: { _all: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const nameOf = (p: unknown) => { const x = (p ?? {}) as { firstName?: string; lastName?: string; email?: string; phone?: string; city?: string }; return { name: [x.firstName, x.lastName].filter(Boolean).join(" ") || "Applicant", email: x.email ?? "", phone: x.phone ?? "", city: x.city ?? "" }; };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Applications" description="Online admissions. Approving creates the student account, enrollment and invoice in one step." />
      <div className="flex flex-wrap gap-2">{STATUSES.map((s) => <Link key={s} href={`/admin/applications?status=${s}`}><Badge variant={sp.status === s ? statusVariant(s) : "default"} className="cursor-pointer">{enumLabel(s)} · {countOf(s)}</Badge></Link>)}</div>
      <FilterBar searchPlaceholder="Application number, name or email" filters={[{ key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) }]} />
      {items.length ? (
        <AdminTable headers={["Applicant", "Course", "Preferred", "Submitted", "Reviewed by", "Status"]}>
          {items.map((a) => {
            const p = nameOf(a.personal);
            return (
              <Row key={a.id}>
                <Cell><Link href={`/admin/applications/${a.id}`} className="font-medium hover:text-accent">{p.name}</Link><span className="block text-caption text-fg-subtle">{a.number} · {p.email || p.phone}</span></Cell>
                <Cell muted>{a.course.title}</Cell>
                <Cell className="text-caption text-fg-muted">{enumLabel(a.preferredMode)}{a.preferredBatch ? <span className="block">{a.preferredBatch.code}</span> : null}</Cell>
                <Cell className="text-caption text-fg-muted">{a.submittedAt ? <>{formatDateTime(a.submittedAt)}<span className="block text-fg-subtle">{relativeTime(a.submittedAt)}</span></> : "—"}</Cell>
                <Cell className="text-caption text-fg-muted">{a.reviewedBy?.name ?? "—"}</Cell>
                <Cell><Badge variant={statusVariant(a.status)}>{enumLabel(a.status)}</Badge></Cell>
              </Row>
            );
          })}
        </AdminTable>
      ) : (
        <EmptyState icon={<FileText />} title="No applications match." description="Applications submitted through /apply appear here." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/applications?${q}`; }} />
    </div>
  );
}
