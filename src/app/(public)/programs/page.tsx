import type { Metadata } from "next";
import { getPublishedPrograms } from "@/server/services/cms";
import { PageHero } from "@/components/marketing/page-hero";
import { ProgramGridSection } from "@/components/marketing/sections/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = buildMetadata({ title: "Programs", description: "Multi-course programs that take you from foundations to job-ready in AI, marketing, development and design.", path: "/programs" });

export default async function ProgramsPage() {
  const programs = await getPublishedPrograms(24);
  return (
    <>
      <PageHero eyebrow="Programs" title="Structured tracks from foundations to job-ready." description="Programs bundle courses, projects and a capstone into one guided journey with a single fee plan." crumbs={[{ label: "Home", href: "/" }, { label: "Programs" }]} />
      {programs.length ? <ProgramGridSection data={{ title: "All programs" }} programs={programs} /> : <div className="container-x py-16"><EmptyState title="Programs are being finalised." description="Browse individual courses in the meantime." /></div>}
    </>
  );
}
