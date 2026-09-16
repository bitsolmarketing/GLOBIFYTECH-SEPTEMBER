import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { TestimonialManager } from "./testimonial-manager";

export const metadata: Metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [sp] = await Promise.all([searchParams, requirePermission("cms.content.manage")]);
  const tab = sp.tab === "stories" ? "stories" : "quotes";
  const [testimonials, stories] = await Promise.all([
    prisma.testimonial.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] }),
    prisma.successStory.findMany({ orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Testimonials & stories" description="Short quotes for the home page, and long-form alumni stories." />
      <nav className="flex w-full gap-1 border-b border-border">
        <Link href="/admin/testimonials" className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === "quotes" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>Quotes ({testimonials.length})</Link>
        <Link href="/admin/testimonials?tab=stories" className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${tab === "stories" ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg"}`}>Success stories ({stories.length})</Link>
      </nav>
      <TestimonialManager
        tab={tab}
        testimonials={testimonials.map((t) => ({ id: t.id, name: t.name, role: t.role ?? "", company: t.company ?? "", quote: t.quote, rating: t.rating, courseTitle: t.courseTitle ?? "", outcome: t.outcome ?? "", isFeatured: t.isFeatured, isApproved: t.isApproved, order: t.order }))}
        stories={stories.map((s) => ({ id: s.id, name: s.name, slug: s.slug, headline: s.headline, story: s.story, outcome: s.outcome ?? "", courseTitle: s.courseTitle ?? "", status: s.status, isFeatured: s.isFeatured }))}
      />
    </div>
  );
}
