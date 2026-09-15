import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { PageHero } from "@/components/marketing/page-hero";
import { Badge } from "@/components/ui/badge";
import { CtaSection } from "@/components/marketing/sections/cta";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;

async function getStory(slug: string) {
  return prisma.successStory.findFirst({ where: { slug, status: "PUBLISHED" }, include: { cover: true } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await getStory(slug);
  if (!s) return {};
  return buildMetadata({ title: s.headline, description: `${s.name}${s.outcome ? ` · ${s.outcome}` : ""}`, path: `/success-stories/${slug}`, image: s.cover?.url, type: "article", publishedTime: s.publishedAt });
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getStory(slug);
  if (!s) notFound();
  return (
    <>
      <PageHero eyebrow={s.courseTitle ?? "Success story"} title={s.headline} description={s.name} crumbs={[{ label: "Success stories", href: "/success-stories" }, { label: s.name }]}>
        {s.outcome ? <Badge variant="success" className="px-3 py-1 text-sm">{s.outcome}</Badge> : null}
      </PageHero>
      <article className="container-x max-w-3xl py-12 md:py-16">
        {s.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.cover.url} alt={s.cover.alt ?? s.name} className="mb-8 w-full rounded-2xl object-cover" />
        ) : null}
        <div className="prose-globify" dangerouslySetInnerHTML={{ __html: s.story }} />
      </article>
      <CtaSection data={{ title: "Your story could be next.", subtitle: "Talk to a counsellor about which course fits your goals.", primaryCta: { label: "Explore courses", href: "/courses" }, secondaryCta: { label: "Talk to admissions", href: "/contact" } }} />
    </>
  );
}
