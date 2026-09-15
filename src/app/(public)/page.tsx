import type { Metadata } from "next";
import { getPublishedPage } from "@/server/services/cms";
import { renderSections } from "@/components/marketing/section-renderer";
import { DEFAULT_HOME_SECTIONS, HERO_STATS } from "@/lib/default-home";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/config/site";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPublishedPage("home");
  return buildMetadata({
    title: page?.seoTitle ?? `${site.name} — ${site.tagline}`,
    description: page?.seoDescription ?? site.description,
    path: "/",
    image: page?.ogImage?.url ?? null,
    noindex: page?.noindex,
  });
}

export default async function HomePage() {
  const page = await getPublishedPage("home");
  const sections = page?.sections.length ? page.sections : DEFAULT_HOME_SECTIONS.map((s, i) => ({ id: `default-${i}`, type: s.type, data: s.data }));
  return renderSections(sections, { heroStats: HERO_STATS });
}
