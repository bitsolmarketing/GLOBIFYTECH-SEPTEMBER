import type { Metadata } from "next";
import { prisma } from "@/server/db/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { SuccessStoriesSection } from "@/components/marketing/sections/misc";
import { TestimonialsSection } from "@/components/marketing/sections/testimonials";
import { getFeaturedTestimonials } from "@/server/services/cms";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;
export const metadata: Metadata = buildMetadata({ title: "Success Stories", description: "Real outcomes from Globify Tech graduates: freelancers, marketers, developers and designers earning within months.", path: "/success-stories" });

export default async function SuccessStoriesPage() {
  const [stories, testimonials] = await Promise.all([
    prisma.successStory.findMany({ where: { status: "PUBLISHED" }, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], take: 30, include: { cover: { select: { url: true, alt: true } } } }),
    getFeaturedTestimonials(9, false),
  ]);
  return (
    <>
      <PageHero eyebrow="Success stories" title="From first lesson to first client." description="These are the students who did the work. Their outcomes are theirs — we just made sure the curriculum matched the market." crumbs={[{ label: "Home", href: "/" }, { label: "Success stories" }]} />
      {stories.length ? <SuccessStoriesSection data={{ title: "Stories" }} stories={stories} /> : <div className="container-x py-16"><EmptyState title="Stories are on their way." /></div>}
      <TestimonialsSection data={{ title: "In their words" }} items={testimonials} />
    </>
  );
}
