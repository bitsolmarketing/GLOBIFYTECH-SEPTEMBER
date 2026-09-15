import type { Metadata } from "next";
import Link from "next/link";
import { Award, Download, ExternalLink, Share2 } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { absoluteUrl, enumLabel, formatDate, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Certificates" };
export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const { studentId } = await requireStudentProfile();
  const [certificates, inProgress] = await Promise.all([
    prisma.certificate.findMany({ where: { studentId }, orderBy: { issuedAt: "desc" }, include: { course: { select: { title: true, slug: true } }, pdf: { select: { url: true } } } }),
    prisma.enrollment.findMany({ where: { studentId, status: "ACTIVE" }, include: { course: { select: { id: true, title: true } }, progress: true } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Certificates" description="QR-verified credentials. Share the link or download the PDF." />
      {certificates.length ? (
        <ul className="grid gap-4 md:grid-cols-2">
          {certificates.map((c) => {
            const verifyUrl = absoluteUrl(`/verify/${c.certificateNumber}`);
            return (
              <li key={c.id} className="surface-raised relative overflow-hidden p-6">
                <span className="absolute inset-y-0 start-0 w-1.5 gradient-brand" aria-hidden />
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent"><Award className="size-6" /></span>
                  <Badge variant={statusVariant(c.status)}>{enumLabel(c.status)}</Badge>
                </div>
                <h2 className="text-h4 mt-4">{c.title}</h2>
                <p className="mt-1 font-mono text-caption text-fg-muted">{c.certificateNumber}</p>
                <p className="text-caption text-fg-subtle">Issued {formatDate(c.issuedAt)}{c.expiresAt ? ` · valid until ${formatDate(c.expiresAt)}` : ""}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {c.pdf ? (
                    <Button asChild size="sm"><a href={c.pdf.url} target="_blank" rel="noreferrer"><Download /> PDF</a></Button>
                  ) : (
                    <Button size="sm" disabled>PDF generating…</Button>
                  )}
                  <Button asChild size="sm" variant="secondary"><Link href={`/verify/${c.certificateNumber}`}><ExternalLink /> Verify page</Link></Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(c.title)}&organizationName=Globify%20Tech&issueYear=${c.issuedAt.getFullYear()}&issueMonth=${c.issuedAt.getMonth() + 1}&certUrl=${encodeURIComponent(verifyUrl)}&certId=${encodeURIComponent(c.certificateNumber)}`} target="_blank" rel="noreferrer">
                      <Share2 /> Add to LinkedIn
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Award />} title="Complete a course to earn your first certificate." description="Certificates issue automatically once the course's completion rules are met." />
      )}
      {inProgress.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-label text-fg-subtle">In progress</h2>
          <ul className="surface divide-y divide-border">
            {inProgress.map((e) => (
              <li key={e.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/student/course/${e.course.id}`} className="font-medium hover:text-accent">{e.course.title}</Link>
                  <Progress value={toNumber(e.progress?.percent ?? 0)} size="sm" className="mt-2" />
                </div>
                <span className="text-caption tabular-nums text-fg-muted">{Math.round(toNumber(e.progress?.percent ?? 0))}%</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
