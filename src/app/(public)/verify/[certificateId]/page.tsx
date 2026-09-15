import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { ShieldCheck, ShieldX, ShieldAlert, Download, Award } from "lucide-react";
import { verifyCertificate } from "@/server/services/certificates";
import { PageHero } from "@/components/marketing/page-hero";
import { VerifyForm } from "../verify-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";
import { formatDate, enumLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ certificateId: string }> }): Promise<Metadata> {
  const { certificateId } = await params;
  return buildMetadata({ title: `Verify ${decodeURIComponent(certificateId)}`, description: "Certificate verification result.", path: `/verify/${certificateId}`, noindex: true });
}

export default async function VerifyResultPage({ params }: { params: Promise<{ certificateId: string }> }) {
  const { certificateId } = await params;
  const id = decodeURIComponent(certificateId);
  const h = await headers();
  const cert = await verifyCertificate(id, { ip: h.get("x-forwarded-for")?.split(",")[0] ?? null, userAgent: h.get("user-agent") });

  if (!cert) {
    return (
      <>
        <PageHero eyebrow="Verification" title="No certificate found." description={`We couldn't find a certificate with ID "${id}". Check the ID and try again, or contact us if you believe this is an error.`} crumbs={[{ label: "Verify", href: "/verify" }, { label: id }]}>
          <div className="mt-4 w-full max-w-lg">
            <VerifyForm defaultValue={id} />
          </div>
        </PageHero>
      </>
    );
  }

  const status = cert.effectiveStatus;
  const tone = status === "VALID" ? "success" : status === "EXPIRED" ? "warning" : "danger";
  const Icon = status === "VALID" ? ShieldCheck : status === "EXPIRED" ? ShieldAlert : ShieldX;
  return (
    <div className="container-x max-w-3xl py-12 md:py-20">
      <div className={cn("surface-raised overflow-hidden", status === "VALID" && "border-success/30")}>
        <div className={cn("flex items-center gap-4 border-b border-border px-6 py-5", status === "VALID" ? "bg-success-soft" : status === "EXPIRED" ? "bg-warning-soft" : "bg-danger-soft")}>
          <Icon className={cn("size-8", status === "VALID" ? "text-success" : status === "EXPIRED" ? "text-warning" : "text-danger")} />
          <div>
            <p className="text-h4">{status === "VALID" ? "This certificate is valid." : status === "EXPIRED" ? "This certificate has expired." : "This certificate has been revoked."}</p>
            <p className="text-body-sm text-fg-muted">Verified {formatDate(new Date(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <Badge variant={tone} className="ms-auto">{enumLabel(status)}</Badge>
        </div>
        <dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-label text-fg-subtle">Certificate ID</dt>
            <dd className="mt-1 font-mono text-base text-fg">{cert.certificateNumber}</dd>
          </div>
          <div>
            <dt className="text-label text-fg-subtle">Issued to</dt>
            <dd className="mt-1 text-base font-medium text-fg">{cert.student.user.name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-label text-fg-subtle">Course</dt>
            <dd className="mt-1 text-base text-fg">
              <Link href={`/courses/${cert.course.slug}`} className="hover:text-accent">
                {cert.title}
              </Link>
              <span className="text-body-sm text-fg-muted">
                {cert.course.durationWeeks ? ` · ${cert.course.durationWeeks} weeks` : ""} · {enumLabel(cert.course.level)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-label text-fg-subtle">Issued on</dt>
            <dd className="mt-1 text-base text-fg">{formatDate(cert.issuedAt, { day: "numeric", month: "long", year: "numeric" })}</dd>
          </div>
          <div>
            <dt className="text-label text-fg-subtle">{cert.expiresAt ? "Valid until" : "Validity"}</dt>
            <dd className="mt-1 text-base text-fg">{cert.expiresAt ? formatDate(cert.expiresAt, { day: "numeric", month: "long", year: "numeric" }) : "No expiry"}</dd>
          </div>
          {cert.signedBy ? (
            <div>
              <dt className="text-label text-fg-subtle">Signed by</dt>
              <dd className="mt-1 text-base text-fg">{cert.signedBy.name}</dd>
            </div>
          ) : null}
          {status === "REVOKED" && cert.revokedReason ? (
            <div className="sm:col-span-2">
              <dt className="text-label text-fg-subtle">Revocation reason</dt>
              <dd className="mt-1 text-base text-fg">{cert.revokedReason}</dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-6 py-4">
          {cert.pdf && status === "VALID" ? (
            <Button asChild variant="secondary" size="sm">
              <a href={cert.pdf.url} target="_blank" rel="noreferrer">
                <Download /> Download PDF
              </a>
            </Button>
          ) : null}
          <span className="ms-auto inline-flex items-center gap-1.5 text-caption text-fg-subtle">
            <Award className="size-3.5" /> Issued by Globify Tech Institute, Faisalabad
          </span>
        </div>
      </div>
      <div className="mt-8">
        <p className="mb-2 text-body-sm text-fg-muted">Verify another certificate</p>
        <VerifyForm />
      </div>
    </div>
  );
}
