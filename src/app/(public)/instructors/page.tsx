import type { Metadata } from "next";
import { getPublicInstructors } from "@/server/services/cms";
import { PageHero } from "@/components/marketing/page-hero";
import { InstructorGridSection } from "@/components/marketing/sections/misc";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;
export const metadata: Metadata = buildMetadata({ title: "Instructors", description: "Meet the practitioners who teach at Globify Tech — marketers, developers, designers and automation specialists who still do the work.", path: "/instructors" });

export default async function InstructorsPage() {
  const instructors = await getPublicInstructors(48, false);
  return (
    <>
      <PageHero eyebrow="Instructors" title="Taught by people who still do the work." description="Every trainer runs live client projects alongside teaching. When the industry changes, the syllabus changes the same month." crumbs={[{ label: "Home", href: "/" }, { label: "Instructors" }]} />
      <InstructorGridSection data={{ title: "Meet the team" }} instructors={instructors} />
    </>
  );
}
