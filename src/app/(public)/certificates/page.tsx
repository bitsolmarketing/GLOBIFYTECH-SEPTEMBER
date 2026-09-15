import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, QrCode, Share2, Award } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { FeaturesSection } from "@/components/marketing/sections/features";
import { VerifyForm } from "@/app/(public)/verify/verify-form";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({ title: "Certificates", description: "Globify Tech certificates are QR-verified digital credentials employers can check in seconds.", path: "/certificates" });

export default function CertificatesPage() {
  return (
    <>
      <PageHero eyebrow="Certificates" title="Credentials employers can verify in seconds." description="Every completed course issues a digital certificate with a unique ID, QR code and public verification page. No PDF forgeries, no phone calls to confirm." crumbs={[{ label: "Home", href: "/" }, { label: "Certificates" }]}>
        <div className="mt-4 w-full max-w-md">
          <VerifyForm />
        </div>
      </PageHero>
      <FeaturesSection
        data={{
          eyebrow: "How it works",
          title: "Earned, issued, verifiable.",
          items: [
            { icon: "certificate", title: "Earned by completion rules", description: "Lessons, quizzes, attendance, projects and fees — each course defines what completion means, and the certificate issues automatically when it's met." },
            { icon: "trust", title: "Unique ID and QR code", description: "Each certificate carries a number like GT-2026-000123 and a QR code that opens its verification page." },
            { icon: "global", title: "Public verification", description: "Anyone can confirm the holder, course and issue date at globifytech.com/verify — including revocation status." },
            { icon: "growth", title: "Shareable", description: "Add it to LinkedIn or your Globify portfolio with one click." },
          ],
        }}
      />
      <section className="container-x pb-20">
        <div className="surface flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft text-accent"><Award className="size-6" /></span>
            <div>
              <p className="text-h4">Ready to earn yours?</p>
              <p className="text-body-sm text-fg-muted">Choose a course and start today.</p>
            </div>
          </div>
          <Button asChild size="lg">
            <Link href="/courses">Explore courses</Link>
          </Button>
        </div>
      </section>
      <span className="hidden"><ShieldCheck /><QrCode /><Share2 /></span>
    </>
  );
}
