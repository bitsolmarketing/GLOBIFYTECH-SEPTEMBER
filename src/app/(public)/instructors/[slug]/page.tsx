import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink, Globe } from "lucide-react";
import { getPublicInstructorBySlug } from "@/server/services/instructors";
import { PageHero } from "@/components/marketing/page-hero";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CourseCard } from "@/components/lms/course-card";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const i = await getPublicInstructorBySlug(slug);
  if (!i) return {};
  return buildMetadata({ title: `${i.user.name} — Instructor`, description: i.bio?.slice(0, 160) ?? i.title, path: `/instructors/${slug}`, image: i.user.avatar?.url });
}

export default async function InstructorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const i = await getPublicInstructorBySlug(slug);
  if (!i) notFound();
  const courses = i.courses.map((c) => c.course).filter((c) => c.status === "PUBLISHED");
  return (
    <>
      <PageHero title={i.user.name} description={i.title} crumbs={[{ label: "Instructors", href: "/instructors" }, { label: i.user.name }]}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={i.user.name} src={i.user.avatar?.url} size="xl" />
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              {i.expertise.map((e) => (
                <Badge key={e} variant="accent">{e}</Badge>
              ))}
            </div>
            <div className="flex gap-3 text-body-sm text-fg-muted">
              {i.yearsExperience ? <span>{i.yearsExperience}+ years experience</span> : null}
              {i.linkedinUrl ? (
                <a href={i.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <ExternalLink className="size-4" /> LinkedIn
                </a>
              ) : null}
              {i.websiteUrl ? (
                <a href={i.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                  <Globe className="size-4" /> Website
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </PageHero>
      <div className="container-x grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h2 className="text-h3 mb-4">About</h2>
          <p className="whitespace-pre-line text-body text-fg-muted">{i.bio ?? "Profile coming soon."}</p>
        </div>
        <div className="lg:col-span-5">
          <h2 className="text-h3 mb-4">Courses by {i.user.name.split(" ")[0]}</h2>
          <div className="grid gap-4">
            {courses.map((c) => (
              <CourseCard key={c.id} course={{ ...c, ratingAvg: c.ratingAvg, artwork: c.artwork ? { url: c.artwork.url } : null }} compact />
            ))}
            {!courses.length ? <p className="text-body-sm text-fg-muted">No published courses yet.</p> : null}
          </div>
        </div>
      </div>
    </>
  );
}
