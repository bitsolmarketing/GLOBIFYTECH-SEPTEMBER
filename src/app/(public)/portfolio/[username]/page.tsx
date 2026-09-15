import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Code2, Award, Sparkles } from "lucide-react";
import { getPublicPortfolio } from "@/server/services/career";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { buildMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const p = await getPublicPortfolio(username);
  if (!p) return { title: "Portfolio", robots: { index: false } };
  return buildMetadata({ title: `${p.student.user.name} — Portfolio`, description: p.headline ?? p.about?.slice(0, 160), path: `/portfolio/${username}`, image: p.student.user.avatar?.url });
}

export default async function PortfolioPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const p = await getPublicPortfolio(username);
  if (!p) notFound();
  const s = p.student;
  return (
    <div className="container-x max-w-5xl py-12 md:py-20">
      <header className="flex flex-col items-start gap-5 md:flex-row md:items-center">
        <Avatar name={s.user.name} src={s.user.avatar?.url} size="xl" className="size-24 text-2xl" />
        <div className="flex flex-col gap-2">
          <h1 className="text-h1">{s.user.name}</h1>
          {p.headline ? <p className="text-body-lg text-fg-muted">{p.headline}</p> : null}
          <div className="flex flex-wrap gap-3 text-body-sm">
            {s.githubUrl ? (
              <a href={s.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
                <Code2 className="size-4" /> GitHub
              </a>
            ) : null}
            {s.linkedinUrl ? (
              <a href={s.linkedinUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
                <ExternalLink className="size-4" /> LinkedIn
              </a>
            ) : null}
            {s.websiteUrl ? (
              <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
                <ExternalLink className="size-4" /> Website
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {p.about ? (
        <section className="mt-12">
          <h2 className="text-label mb-3 text-fg-subtle">About</h2>
          <p className="max-w-3xl whitespace-pre-line text-body text-fg-muted">{p.about}</p>
        </section>
      ) : null}

      {p.showSkills && s.skills.length ? (
        <section className="mt-12">
          <h2 className="text-label mb-3 text-fg-subtle">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {s.skills.map((sk) => (
              <Badge key={sk.skillId} variant={sk.verified ? "accent" : "outline"} className="px-3 py-1 text-sm">
                {sk.verified ? <Sparkles className="size-3" /> : null}
                {sk.skill.name}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      {p.projects.length ? (
        <section className="mt-12">
          <h2 className="text-label mb-4 text-fg-subtle">Projects</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {p.projects.map((pr) => (
              <article key={pr.id} className="surface flex flex-col overflow-hidden">
                <div className="aspect-[16/9] w-full bg-bg-muted">
                  <CourseArtwork artworkKey="development" seed={pr.id} title={pr.title} imageUrl={pr.cover?.url} alt={pr.cover?.alt} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-h4">{pr.title}</h3>
                  {pr.description ? <p className="text-body-sm line-clamp-4 text-fg-muted">{pr.description}</p> : null}
                  <div className="flex flex-wrap gap-1.5">
                    {pr.skills.slice(0, 5).map((sk) => (
                      <Badge key={sk}>{sk}</Badge>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-3 pt-2 text-body-sm">
                    {pr.liveUrl ? (
                      <a href={pr.liveUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                        <ExternalLink className="size-4" /> Live
                      </a>
                    ) : null}
                    {pr.repoUrl ? (
                      <a href={pr.repoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-fg-muted hover:text-fg">
                        <Code2 className="size-4" /> Code
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {p.showCertificates && s.certificates.length ? (
        <section className="mt-12">
          <h2 className="text-label mb-4 text-fg-subtle">Certificates</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {s.certificates.map((c) => (
              <li key={c.id}>
                <Link href={`/verify/${c.certificateNumber}`} className="surface surface-hover flex items-center gap-4 p-4">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent"><Award className="size-5" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-fg">{c.course.title}</p>
                    <p className="text-caption text-fg-muted">{c.certificateNumber} · {formatDate(c.issuedAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mt-16 border-t border-border pt-6 text-caption text-fg-subtle">
        Portfolio hosted by <Link href="/" className="hover:text-fg">Globify Tech</Link>. Certificates are verifiable at globifytech.com/verify.
      </footer>
    </div>
  );
}
