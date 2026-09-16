import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ArrowRight } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { COURSE_CARD_SELECT } from "@/server/services/courses";
import { PageHero } from "@/components/marketing/page-hero";
import { CourseCard } from "@/components/lms/course-card";
import { Button } from "@/components/ui/button";
import { LeadForm } from "@/components/marketing/lead-form";
import { buildMetadata } from "@/lib/seo";
import { formatMoney, toNumber } from "@/lib/utils";

export const revalidate = 300;

async function getProgram(slug: string) {
  return prisma.program.findFirst({ where: { slug, status: "PUBLISHED", deletedAt: null }, include: { artwork: true, courses: { orderBy: { order: "asc" }, include: { course: { select: COURSE_CARD_SELECT } } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p) return {};
  return buildMetadata({ title: p.seoTitle ?? p.title, description: p.seoDescription ?? p.subtitle, path: `/programs/${slug}`, image: p.artwork?.url });
}

export default async function ProgramPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p) notFound();
  const courses = p.courses.map((c) => c.course).filter((c) => c.status === "PUBLISHED");
  return (
    <>
      <PageHero eyebrow="Program" title={p.title} description={p.subtitle} crumbs={[{ label: "Programs", href: "/programs" }, { label: p.title }]}>
        <div className="flex flex-wrap items-center gap-4 text-body-sm text-fg-muted">
          <span>{courses.length} courses</span>
          {p.durationWeeks ? <span>· {p.durationWeeks} weeks</span> : null}
          {p.price != null ? <span className="font-semibold text-fg">· {formatMoney(toNumber(p.price), p.currency)}</span> : null}
        </div>
        <div className="mt-2 flex gap-3">
          <Button asChild size="lg">
            <Link href={`/apply${courses[0] ? `?course=${courses[0].slug}` : ""}`}>
              Apply for this program <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
      </PageHero>
      <div className="container-x grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-12 lg:col-span-8">
          {p.description ? <div className="prose-globify" dangerouslySetInnerHTML={{ __html: p.description }} /> : null}
          {p.outcomes.length ? (
            <section>
              <h2 className="text-h2 mb-5">What you’ll be able to do</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {p.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-fg-muted">
                    <Check className="mt-1 size-4 shrink-0 text-success" /> {o}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h2 className="text-h2 mb-5">Courses in this program</h2>
            <ol className="grid gap-5 sm:grid-cols-2">
              {courses.map((c, i) => (
                <li key={c.id} className="relative">
                  <span className="absolute -start-2 -top-2 z-10 flex size-7 items-center justify-center rounded-full bg-fg text-caption font-semibold text-fg-inverse">{i + 1}</span>
                  <CourseCard course={c} compact className="h-full" />
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="lg:col-span-4">
          <div className="surface sticky top-24 p-6">
            <h3 className="text-h4 mb-1">Talk to a counsellor</h3>
            <p className="mb-4 text-body-sm text-fg-muted">Ask about batches, fee plans and scholarships for this program.</p>
            <LeadForm courseId={courses[0]?.id ?? null} courseTitle={p.title} compact />
          </div>
        </aside>
      </div>
    </>
  );
}
