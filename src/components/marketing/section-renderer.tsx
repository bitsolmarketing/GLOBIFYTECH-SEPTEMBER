import type { PageSectionType } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { getFeaturedCourses, COURSE_CARD_SELECT } from "@/server/services/courses";
import { getFeaturedTestimonials, getFaqs, getUpcomingEvents, getFeaturedStories, getPublicInstructors, getPublishedPrograms, getPublishedPaths, getRecentPosts } from "@/server/services/cms";
import { HeroSection, type HeroData } from "./sections/hero";
import { FeaturesSection, type FeaturesData } from "./sections/features";
import { StatsSection, type StatsData } from "./sections/stats";
import { TestimonialsSection } from "./sections/testimonials";
import { FaqSection } from "./sections/faq";
import { CtaSection, type CtaData } from "./sections/cta";
import { CourseGridSection } from "./sections/course-grid";
import { TextSection, ImageSection, VideoSection, GallerySection, TimelineSection, LogoCloudSection, ProgramGridSection, InstructorGridSection, BlogSection, LearningPathsSection, EventsSection, SuccessStoriesSection } from "./sections/misc";

export interface RenderableSection {
  id: string;
  type: PageSectionType;
  data: unknown;
}

type D = Record<string, unknown>;

/**
 * Server-side registry: resolves each CMS section's data (courses, posts…)
 * and renders the matching component. Unknown or broken sections render
 * nothing rather than breaking the page.
 */
export async function renderSection(section: RenderableSection, ctx?: { heroStats?: Array<{ value: string; label: string }> }) {
  const d = (section.data ?? {}) as D;
  switch (section.type) {
    case "HERO": {
      const media = d.mediaId ? await prisma.media.findUnique({ where: { id: String(d.mediaId) }, select: { url: true } }) : null;
      return <HeroSection key={section.id} data={{ ...(d as unknown as HeroData), mediaUrl: media?.url ?? null }} stats={ctx?.heroStats} />;
    }
    case "TEXT":
      return <TextSection key={section.id} data={d as never} />;
    case "IMAGE": {
      const media = await prisma.media.findUnique({ where: { id: String(d.mediaId) }, select: { url: true, alt: true } });
      return media ? <ImageSection key={section.id} data={d as never} url={media.url} alt={media.alt} /> : null;
    }
    case "VIDEO": {
      const media = d.mediaId ? await prisma.media.findUnique({ where: { id: String(d.mediaId) }, select: { url: true } }) : null;
      const url = media?.url ?? (d.url as string | undefined);
      return url ? <VideoSection key={section.id} data={d as never} url={url} /> : null;
    }
    case "GALLERY": {
      const ids = (d.mediaIds as string[]) ?? [];
      const media = await prisma.media.findMany({ where: { id: { in: ids } }, select: { id: true, url: true, alt: true } });
      return <GallerySection key={section.id} data={d as never} items={ids.map((id) => media.find((m) => m.id === id)).filter((m): m is NonNullable<typeof m> => !!m)} />;
    }
    case "COURSE_GRID": {
      const limit = Number(d.limit ?? 6);
      const mode = (d.mode as string) ?? "featured";
      let courses;
      if (mode === "manual" && Array.isArray(d.courseIds) && d.courseIds.length) courses = await prisma.course.findMany({ where: { id: { in: d.courseIds as string[] }, status: "PUBLISHED", deletedAt: null }, select: COURSE_CARD_SELECT });
      else if (mode === "category" && d.categoryId) courses = await prisma.course.findMany({ where: { categoryId: String(d.categoryId), status: "PUBLISHED", deletedAt: null }, take: limit, orderBy: { studentCount: "desc" }, select: COURSE_CARD_SELECT });
      else if (mode === "latest") courses = await prisma.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, take: limit, orderBy: { publishedAt: "desc" }, select: COURSE_CARD_SELECT });
      else courses = await getFeaturedCourses(limit);
      if (!courses.length) courses = await prisma.course.findMany({ where: { status: "PUBLISHED", deletedAt: null }, take: limit, orderBy: { studentCount: "desc" }, select: COURSE_CARD_SELECT });
      return <CourseGridSection key={section.id} data={d as never} courses={courses} />;
    }
    case "PROGRAM_GRID":
      return <ProgramGridSection key={section.id} data={d as never} programs={await getPublishedPrograms(Number(d.limit ?? 4))} />;
    case "INSTRUCTOR_GRID":
      return <InstructorGridSection key={section.id} data={d as never} instructors={await getPublicInstructors(Number(d.limit ?? 4), d.featuredOnly !== false)} />;
    case "STATS":
      return <StatsSection key={section.id} data={d as unknown as StatsData} />;
    case "TESTIMONIALS":
      return <TestimonialsSection key={section.id} data={d as never} items={await getFeaturedTestimonials(Number(d.limit ?? 6), d.featuredOnly !== false)} />;
    case "FAQ":
      return <FaqSection key={section.id} data={d as never} items={await getFaqs(String(d.group ?? "general"), Number(d.limit ?? 8))} />;
    case "CTA":
      return <CtaSection key={section.id} data={d as unknown as CtaData} />;
    case "BLOG":
      return <BlogSection key={section.id} data={d as never} posts={await getRecentPosts(Number(d.limit ?? 3))} />;
    case "TIMELINE":
      return <TimelineSection key={section.id} data={d as never} />;
    case "LOGO_CLOUD": {
      const logos = (d.logos as Array<{ name: string; mediaId?: string | null; href?: string }>) ?? [];
      const media = await prisma.media.findMany({ where: { id: { in: logos.map((l) => l.mediaId).filter((x): x is string => !!x) } }, select: { id: true, url: true } });
      return <LogoCloudSection key={section.id} data={d as never} logos={logos.map((l) => ({ name: l.name, href: l.href, url: media.find((m) => m.id === l.mediaId)?.url ?? null }))} />;
    }
    case "FEATURES":
      return <FeaturesSection key={section.id} data={d as unknown as FeaturesData} />;
    case "LEARNING_PATHS":
      return <LearningPathsSection key={section.id} data={d as never} paths={await getPublishedPaths(Number(d.limit ?? 3))} />;
    case "EVENTS":
      return <EventsSection key={section.id} data={d as never} events={await getUpcomingEvents(Number(d.limit ?? 3))} />;
    case "SUCCESS_STORIES":
      return <SuccessStoriesSection key={section.id} data={d as never} stories={await getFeaturedStories(Number(d.limit ?? 3))} />;
    default:
      return null;
  }
}

export async function renderSections(sections: RenderableSection[], ctx?: { heroStats?: Array<{ value: string; label: string }> }) {
  const rendered = await Promise.all(sections.map((s) => renderSection(s, ctx)));
  return <>{rendered}</>;
}
