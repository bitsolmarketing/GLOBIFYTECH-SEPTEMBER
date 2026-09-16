import type { Metadata } from "next";
import Link from "next/link";
import { Award, Download, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/server/auth/session";
import { listCertificates } from "@/server/services/certificates";
import { prisma } from "@/server/db/prisma";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/admin/filter-bar";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { RevokeCertificate, ReinstateCertificate, IssuePendingCertificates } from "./certificate-actions";
import { enumLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; course?: string; page?: string }> }) {
  const [sp, user] = await Promise.all([searchParams, requirePermission("certificates.read")]);
  const page = Number(sp.page ?? 1) || 1;
  const status = sp.status === "VALID" || sp.status === "REVOKED" || sp.status === "EXPIRED" ? sp.status : undefined;
  const [{ items, total, pageSize }, courses, awaiting] = await Promise.all([
    listCertificates({ q: sp.q, status, courseId: sp.course, page, pageSize: 25 }),
    prisma.course.findMany({ where: { deletedAt: null }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    can(user, "certificates.issue") ? prisma.enrollment.findMany({ where: { status: "COMPLETED", certificate: null }, take: 50, select: { id: true, student: { select: { studentNumber: true, user: { select: { name: true } } } }, course: { select: { title: true } }, completion: { select: { completedAt: true } } } }) : [],
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Certificates" description={`${total} certificates issued. Every certificate has a public verification page.`} actions={<Button asChild variant="outline" size="sm"><Link href="/verify" target="_blank"><ShieldCheck /> Public verification</Link></Button>} />
      {awaiting.length ? <IssuePendingCertificates items={awaiting.map((e) => ({ enrollmentId: e.id, student: e.student.user.name, studentNumber: e.student.studentNumber, course: e.course.title, completedAt: e.completion?.completedAt?.toISOString() ?? null }))} /> : null}
      <FilterBar searchPlaceholder="Certificate number or student name" filters={[{ key: "status", label: "statuses", options: [{ value: "VALID", label: "Valid" }, { value: "REVOKED", label: "Revoked" }, { value: "EXPIRED", label: "Expired" }] }, { key: "course", label: "courses", options: courses.map((c) => ({ value: c.id, label: c.title })) }]} />
      {items.length ? (
        <AdminTable headers={["Certificate", "Student", "Course", "Issued", { label: "Verifications", align: "end" }, "Status", { label: "", align: "end" }]}>
          {items.map((c) => (
            <Row key={c.id}>
              <Cell><Link href={`/verify/${c.certificateNumber}`} target="_blank" className="font-medium hover:text-accent">{c.certificateNumber}</Link></Cell>
              <Cell><Link href={`/admin/students/${c.student.id}`} className="hover:text-accent">{c.student.user.name}</Link><span className="block text-caption text-fg-subtle">{c.student.studentNumber}</span></Cell>
              <Cell muted>{c.course.title}</Cell>
              <Cell className="text-caption text-fg-muted">{formatDate(c.issuedAt)}{c.expiresAt ? <span className="block text-fg-subtle">expires {formatDate(c.expiresAt)}</span> : null}</Cell>
              <Cell align="end">{c._count.verifications}</Cell>
              <Cell><Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge></Cell>
              <Cell align="end">
                <div className="flex justify-end gap-1">
                  {c.pdf?.url ? <Button asChild variant="ghost" size="sm"><a href={c.pdf.url} download aria-label="Download PDF"><Download /></a></Button> : null}
                  {can(user, "certificates.revoke") ? (c.status === "REVOKED" ? <ReinstateCertificate id={c.id} /> : <RevokeCertificate id={c.id} number={c.certificateNumber} />) : null}
                </div>
              </Cell>
            </Row>
          ))}
        </AdminTable>
      ) : (
        <EmptyState icon={<Award />} title="No certificates match." description="Certificates are issued automatically when a student meets the course completion rule." />
      )}
      <Pagination page={page} pageSize={pageSize} total={total} hrefFor={(p) => { const q = new URLSearchParams(); for (const [k, v] of Object.entries(sp)) if (v && k !== "page") q.set(k, v); q.set("page", String(p)); return `/admin/certificates?${q}`; }} />
    </div>
  );
}
