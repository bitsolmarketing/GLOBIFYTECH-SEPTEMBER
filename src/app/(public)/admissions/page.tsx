import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getPublishedPage, getFaqs } from "@/server/services/cms";
import { renderSections } from "@/components/marketing/section-renderer";
import { PageHero } from "@/components/marketing/page-hero";
import { TimelineSection } from "@/components/marketing/sections/misc";
import { FaqSection } from "@/components/marketing/sections/faq";
import { LeadForm } from "@/components/marketing/lead-form";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;
export const metadata: Metadata = buildMetadata({ title: "Admissions", description: "How admissions work at Globify Tech: counselling, online application, approval within two working days, flexible fee plans and scholarships.", path: "/admissions" });

export default async function AdmissionsPage() {
  const page = await getPublishedPage("admissions");
  if (page?.sections.length) return renderSections(page.sections);
  const faqs = await getFaqs("admissions", 8);
  return (
    <>
      <PageHero eyebrow="Admissions" title="From enquiry to enrolled in under a week." description="Apply online in ten minutes. A counsellor reviews your goals, recommends a batch and confirms your seat — usually within two working days." crumbs={[{ label: "Home", href: "/" }, { label: "Admissions" }]}>
        <div className="mt-2 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/apply">
              Apply online <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/courses">Browse courses</Link>
          </Button>
        </div>
      </PageHero>
      <TimelineSection data={{ title: "How it works", items: [{ title: "Choose a course", description: "Pick a course or program and check upcoming batches.", meta: "5 minutes" }, { title: "Apply online", description: "Personal details, education, goals and a couple of documents.", meta: "10 minutes" }, { title: "Counselling call", description: "A counsellor confirms the course fits your goals and answers questions.", meta: "Within 24 hours" }, { title: "Approval & fee plan", description: "Admissions approves and issues your invoice — pay in full or in installments.", meta: "Within 2 working days" }, { title: "Start learning", description: "Your learning space opens the moment your seat is confirmed.", meta: "Batch start date" }] }} />
      <section className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-6">
          <h2 className="text-h2">Fees, installments and scholarships</h2>
          <p className="text-body text-fg-muted">Every course has a fee plan with monthly installments. Merit and need-based scholarships cover up to 50% of fees for eligible students — ask your counsellor during the call. Bank transfer, JazzCash, Easypaisa and cards are accepted.</p>
          <h3 className="text-h4">What you’ll need</h3>
          <ul className="list-disc space-y-1 ps-5 text-body text-fg-muted">
            <li>CNIC or B-Form (photo or scan)</li>
            <li>Latest education certificate or transcript</li>
            <li>A recent photo</li>
            <li>For scholarship applicants: a short statement of need or merit</li>
          </ul>
        </div>
        <div className="lg:col-span-6">
          <div className="surface p-6">
            <h3 className="text-h4 mb-1">Prefer to talk first?</h3>
            <p className="mb-4 text-body-sm text-fg-muted">Leave your number and a counsellor will call you back.</p>
            <LeadForm compact />
          </div>
        </div>
      </section>
      <FaqSection data={{ title: "Admissions FAQ" }} items={faqs} />
    </>
  );
}
