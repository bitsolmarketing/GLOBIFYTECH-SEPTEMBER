import type { Metadata } from "next";
import { getPublishedPage } from "@/server/services/cms";
import { renderSections } from "@/components/marketing/section-renderer";
import { PageHero } from "@/components/marketing/page-hero";
import { StatsSection } from "@/components/marketing/sections/stats";
import { FeaturesSection } from "@/components/marketing/sections/features";
import { TimelineSection } from "@/components/marketing/sections/misc";
import { CtaSection } from "@/components/marketing/sections/cta";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/config/site";

export const revalidate = 600;
export const metadata: Metadata = buildMetadata({ title: "About", description: "Globify Tech is a practical, project-first institute in Faisalabad building the careers of tomorrow with AI-powered education.", path: "/about" });

export default async function AboutPage() {
  const page = await getPublishedPage("about");
  if (page?.sections.length) return renderSections(page.sections);
  return (
    <>
      <PageHero eyebrow="About Globify Tech" title="A serious institute for people who want to do serious work." description={`Since ${site.foundedYear} we've trained thousands of students in Faisalabad and online — not with lectures, but with live budgets, real client briefs and weekly critique.`} />
      <StatsSection data={{ items: [{ value: "8,500+", label: "Students trained" }, { value: "92%", label: "Completion rate" }, { value: "76%", label: "Earning within 6 months" }, { value: "45+", label: "Hiring partners" }] }} />
      <FeaturesSection
        data={{
          eyebrow: "How we teach",
          title: "80% hands-on. Every week ends with something shipped.",
          items: [
            { icon: "projects", title: "Project-first", description: "Each module produces an artefact you can show a client — a campaign, a site, a design system, an automation." },
            { icon: "mentors", title: "Practitioners, not lecturers", description: "Our trainers still run client work. When the industry changes, the syllabus changes the same month." },
            { icon: "community", title: "Small batches", description: "Never more than 18 students, so critique is personal and nobody hides at the back." },
            { icon: "ai", title: "AI-native", description: "Globify AI tutors you inside every lesson, and AI tooling is part of every course — because it's part of every job now." },
            { icon: "career", title: "Career-connected", description: "Internships, job matching, freelance profile setup and interview prep are part of the platform, not an afterthought." },
            { icon: "global", title: "Global by design", description: "On campus in Faisalabad or live online from anywhere. Certificates verify instantly for any employer." },
          ],
        }}
      />
      <TimelineSection data={{ title: "Your journey with us", items: [{ title: "Discover & counselling", description: "Talk to a counsellor about goals, batches and fees." }, { title: "Apply & enroll", description: "Apply online in minutes; admissions confirms within two working days." }, { title: "Learn & practise", description: "Lessons, live classes, quizzes and weekly submissions with critique." }, { title: "Build real projects", description: "Capstone work reviewed against a rubric — approved projects go straight to your portfolio." }, { title: "Certify", description: "QR-verified certificate once completion rules are met." }, { title: "Get hired or go freelance", description: "Job matching, internships and freelance setup through the Career Center." }] }} />
      <CtaSection data={{ title: "Visit the campus or talk to us online.", subtitle: `${site.contact.address} · ${site.contact.hours}`, primaryCta: { label: "Contact admissions", href: "/contact" }, secondaryCta: { label: "Explore courses", href: "/courses" }, variant: "dark" }} />
    </>
  );
}
