import type { Metadata } from "next";
import { getPublishedPaths } from "@/server/services/cms";
import { PageHero } from "@/components/marketing/page-hero";
import { LearningPathsSection } from "@/components/marketing/sections/misc";
import { EmptyState } from "@/components/ui/empty-state";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;
export const metadata: Metadata = buildMetadata({ title: "Learning Paths", description: "Guided roadmaps to specific careers: AI marketing, full-stack development, design, automation and freelancing.", path: "/learning-paths" });

export default async function LearningPathsPage() {
  const paths = await getPublishedPaths(24);
  return (
    <>
      <PageHero eyebrow="Learning paths" title="Know exactly what to learn next." description="Each path sequences courses, projects and a capstone toward a named career outcome. Completed steps light up as you go." crumbs={[{ label: "Home", href: "/" }, { label: "Learning paths" }]} />
      {paths.length ? <LearningPathsSection data={{ title: "All learning paths" }} paths={paths} /> : <div className="container-x py-16"><EmptyState title="Learning paths are being finalised." /></div>}
    </>
  );
}
