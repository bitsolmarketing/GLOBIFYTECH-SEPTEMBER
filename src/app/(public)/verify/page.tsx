import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/page-hero";
import { VerifyForm } from "./verify-form";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Verify a certificate", description: "Confirm the authenticity of a Globify Tech certificate by its ID or verification code.", path: "/verify" });

export default function VerifyPage() {
  return (
    <>
      <PageHero eyebrow="Verification" title="Verify a Globify Tech certificate." description="Enter the certificate ID printed on the document or scan its QR code." crumbs={[{ label: "Home", href: "/" }, { label: "Verify" }]}>
        <div className="mt-4 w-full max-w-lg">
          <VerifyForm />
        </div>
      </PageHero>
      <div className="container-x max-w-2xl py-12 text-body-sm text-fg-muted">
        <p>Employers and institutions can verify credentials without contacting us. Verification pages show the holder’s name, course, issue date and current status (valid, expired or revoked). Every lookup is logged for the holder’s security.</p>
      </div>
    </>
  );
}
