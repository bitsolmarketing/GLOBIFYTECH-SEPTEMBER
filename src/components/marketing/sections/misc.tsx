import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Check, ChevronRight } from "lucide-react";
import { cn, formatDate, truncate } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CourseArtwork } from "../course-artwork";
import { Reveal, RevealGroup, RevealItem } from "../motion";
import { SectionIntro } from "./features";

// ───────────── Text ─────────────
export function TextSection({ data }: { data: { eyebrow?: string; title?: string; body: string; align?: "start" | "center"; narrow?: boolean } }) {
  return (
    <section className="py-16 md:py-24">
      <div className={cn("container-x", data.narrow !== false && "max-w-3xl", data.align === "center" && "text-center")}>
        <SectionIntro eyebrow={data.eyebrow} title={data.title} align={data.align} className="mb-6" />
        <Reveal>
          <div className="prose-globify" dangerouslySetInnerHTML={{ __html: data.body }} />
        </Reveal>
      </div>
    </section>
  );
}

// ───────────── Image / Video / Gallery ─────────────
export function ImageSection({ data, url, alt }: { data: { caption?: string; full?: boolean }; url: string; alt?: string | null }) {
  return (
    <section className="py-8 md:py-12">
      <Reveal className={cn(data.full ? "w-full" : "container-x")}>
        <figure className={cn("overflow-hidden", !data.full && "rounded-2xl")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt ?? data.caption ?? ""} className="w-full object-cover" loading="lazy" />
          {data.caption ? <figcaption className="mt-3 text-center text-caption text-fg-muted">{data.caption}</figcaption> : null}
        </figure>
      </Reveal>
    </section>
  );
}

export function VideoSection({ data, url }: { data: { title?: string; caption?: string }; url: string }) {
  const embed = url.includes("youtube") || url.includes("youtu.be") ? `https://www.youtube-nocookie.com/embed/${url.match(/(?:v=|be\/|embed\/)([\w-]+)/)?.[1] ?? ""}?rel=0` : url.includes("vimeo") ? `https://player.vimeo.com/video/${url.match(/vimeo\.com\/(\d+)/)?.[1] ?? ""}` : null;
  return (
    <section className="py-16 md:py-24">
      <div className="container-x max-w-4xl">
        <SectionIntro title={data.title} align="center" className="mb-8" />
        <Reveal className="overflow-hidden rounded-2xl border border-border bg-black shadow-lg">
          <div className="aspect-video">
            {embed ? <iframe src={embed} title={data.title ?? "Video"} className="size-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen /> : <video src={url} controls className="size-full" />}
          </div>
        </Reveal>
        {data.caption ? <p className="mt-3 text-center text-caption text-fg-muted">{data.caption}</p> : null}
      </div>
    </section>
  );
}

export function GallerySection({ data, items }: { data: { title?: string; columns?: number }; items: Array<{ id: string; url: string; alt?: string | null }> }) {
  return (
    <section className="py-16 md:py-24">
      <div className="container-x">
        <SectionIntro title={data.title} align="center" />
        <RevealGroup className={cn("grid gap-3", data.columns === 2 ? "sm:grid-cols-2" : data.columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3")}>
          {items.map((m) => (
            <RevealItem key={m.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt ?? ""} className="aspect-[4/3] w-full rounded-xl object-cover" loading="lazy" />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Timeline ─────────────
export function TimelineSection({ data }: { data: { title?: string; items: Array<{ title: string; description?: string; meta?: string }> } }) {
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Your journey" title={data.title} align="center" />
        <RevealGroup className="relative mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
          <span className="absolute inset-y-0 start-1/2 hidden w-px -translate-x-1/2 bg-border md:block" aria-hidden />
          {data.items.map((item, i) => (
            <RevealItem key={item.title} className={cn("md:col-span-1", i % 2 === 1 ? "md:col-start-2" : "md:col-start-1")}>
              <div className="surface relative flex flex-col gap-2 p-6">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">{i + 1}</span>
                <h3 className="text-h4 text-fg">{item.title}</h3>
                {item.description ? <p className="text-body-sm text-fg-muted">{item.description}</p> : null}
                {item.meta ? <span className="text-caption text-fg-subtle">{item.meta}</span> : null}
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Logo cloud ─────────────
export function LogoCloudSection({ data, logos }: { data: { title?: string }; logos: Array<{ name: string; url?: string | null; href?: string }> }) {
  return (
    <section className="py-12 md:py-16">
      <div className="container-x">
        {data.title ? <p className="mb-8 text-center text-label text-fg-subtle">{data.title}</p> : null}
        <Reveal className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6 opacity-80 grayscale transition-opacity hover:opacity-100 hover:grayscale-0">
          {logos.map((l) =>
            l.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={l.name} src={l.url} alt={l.name} className="h-8 w-auto object-contain" loading="lazy" />
            ) : (
              <span key={l.name} className="text-lg font-semibold tracking-tight text-fg-muted">
                {l.name}
              </span>
            ),
          )}
        </Reveal>
      </div>
    </section>
  );
}

// ───────────── Programs ─────────────
export interface ProgramItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  durationWeeks?: number | null;
  outcomes: string[];
  artwork?: { url: string } | null;
  courses: Array<{ course: { slug: string; title: string; category?: { artworkKey: string } | null } }>;
}

export function ProgramGridSection({ data, programs }: { data: { title?: string; subtitle?: string }; programs: ProgramItem[] }) {
  if (!programs.length) return null;
  return (
    <section className="bg-bg-subtle py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Programs" title={data.title ?? "Programs built for real careers"} subtitle={data.subtitle} />
        <RevealGroup className="grid gap-5 md:grid-cols-2">
          {programs.map((p) => (
            <RevealItem key={p.id}>
              <Link href={`/programs/${p.slug}`} className="group surface surface-hover flex h-full flex-col gap-5 overflow-hidden md:flex-row">
                <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden md:aspect-auto md:w-2/5">
                  <CourseArtwork artworkKey={p.courses[0]?.course.category?.artworkKey ?? "ai"} seed={p.slug} title={p.title} imageUrl={p.artwork?.url} />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-6 md:ps-0">
                  <div>
                    <h3 className="text-h3 text-fg group-hover:text-accent">{p.title}</h3>
                    {p.subtitle ? <p className="mt-1 text-body-sm text-fg-muted">{p.subtitle}</p> : null}
                  </div>
                  <ul className="flex flex-col gap-1.5 text-body-sm text-fg-muted">
                    {p.outcomes.slice(0, 3).map((o) => (
                      <li key={o} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-success" /> {o}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-center justify-between pt-2 text-caption text-fg-subtle">
                    <span>
                      {p.courses.length} courses{p.durationWeeks ? ` · ${p.durationWeeks} weeks` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1 text-accent">
                      Explore <ArrowRight className="size-3.5 rtl:rotate-180" />
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Instructors ─────────────
export interface InstructorItem {
  id: string;
  slug: string;
  title?: string | null;
  expertise: string[];
  user: { name: string; avatar?: { url: string } | null };
  courses: Array<{ course: { slug: string; title: string; status: string } }>;
}

export function InstructorGridSection({ data, instructors }: { data: { title?: string; subtitle?: string }; instructors: InstructorItem[] }) {
  if (!instructors.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Instructors" title={data.title ?? "Learn from people who still do the work"} subtitle={data.subtitle ?? "Every trainer runs live client projects alongside teaching, so the syllabus changes when the industry does."} />
        <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {instructors.map((i) => (
            <RevealItem key={i.id}>
              <Link href={`/instructors/${i.slug}`} className="group surface surface-hover flex h-full flex-col items-start gap-4 p-6">
                <Avatar name={i.user.name} src={i.user.avatar?.url} size="xl" />
                <div className="flex flex-col gap-0.5">
                  <h3 className="text-h4 text-fg group-hover:text-accent">{i.user.name}</h3>
                  {i.title ? <p className="text-body-sm text-fg-muted">{i.title}</p> : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {i.expertise.slice(0, 3).map((e) => (
                    <Badge key={e}>{e}</Badge>
                  ))}
                </div>
                <span className="mt-auto text-caption text-fg-subtle">{i.courses.filter((c) => c.course.status === "PUBLISHED").length} courses</span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Blog ─────────────
export interface BlogItem {
  id: string;
  slug: string;
  title: string;
  excerpt?: string | null;
  publishedAt?: Date | null;
  readingMinutes?: number | null;
  featured?: { url: string; alt?: string | null } | null;
  category?: { name: string } | null;
  author?: { name: string; avatar?: { url: string } | null } | null;
}

export function BlogCard({ post }: { post: BlogItem }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group surface surface-hover flex h-full flex-col overflow-hidden">
      <div className="aspect-[16/9] w-full overflow-hidden bg-bg-muted">
        <CourseArtwork artworkKey="creative" seed={post.slug} title={post.title} imageUrl={post.featured?.url} alt={post.featured?.alt} className="transition-transform duration-500 group-hover:scale-[1.03]" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center gap-2 text-caption text-fg-subtle">
          {post.category ? <span className="text-accent">{post.category.name}</span> : null}
          {post.publishedAt ? <span>· {formatDate(post.publishedAt)}</span> : null}
          {post.readingMinutes ? <span>· {post.readingMinutes} min</span> : null}
        </div>
        <h3 className="text-h4 line-clamp-2 text-fg group-hover:text-accent">{post.title}</h3>
        {post.excerpt ? <p className="text-body-sm line-clamp-2 text-fg-muted">{truncate(post.excerpt, 140)}</p> : null}
        {post.author ? (
          <div className="mt-auto flex items-center gap-2 pt-2 text-caption text-fg-muted">
            <Avatar name={post.author.name} src={post.author.avatar?.url} size="xs" /> {post.author.name}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function BlogSection({ data, posts }: { data: { title?: string; subtitle?: string }; posts: BlogItem[] }) {
  if (!posts.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionIntro eyebrow="Blog" title={data.title ?? "From the blog"} subtitle={data.subtitle} className="mb-0 md:mb-0" />
          <Button asChild variant="ghost" className="mb-2 hidden md:inline-flex">
            <Link href="/blog">
              All articles <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <RevealGroup className="mt-10 grid gap-5 md:grid-cols-3">
          {posts.map((p) => (
            <RevealItem key={p.id}>
              <BlogCard post={p} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Learning paths ─────────────
export interface PathItem {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  careerGoal?: string | null;
  artworkKey: string;
  steps: Array<{ id: string; title: string; isOptional: boolean; course?: { slug: string; title: string } | null }>;
}

export function LearningPathsSection({ data, paths }: { data: { title?: string; subtitle?: string }; paths: PathItem[] }) {
  if (!paths.length) return null;
  return (
    <section className="bg-bg-subtle py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Learning paths" title={data.title ?? "Follow a roadmap to a career"} subtitle={data.subtitle ?? "Each path sequences courses, projects and a capstone so you always know the next step."} />
        <RevealGroup className="grid gap-5 lg:grid-cols-3">
          {paths.map((p) => (
            <RevealItem key={p.id}>
              <Link href={`/learning-paths/${p.slug}`} className="group surface surface-hover flex h-full flex-col gap-5 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {p.careerGoal ? <p className="text-label text-accent">{p.careerGoal}</p> : null}
                    <h3 className="mt-1 text-h4 text-fg group-hover:text-accent">{p.title}</h3>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
                </div>
                <ol className="relative flex flex-col gap-3">
                  {p.steps.slice(0, 6).map((s, i) => (
                    <li key={s.id} className="flex items-center gap-3 text-body-sm">
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", i === 0 ? "bg-accent text-white" : "bg-bg-muted text-fg-muted")}>{i + 1}</span>
                      <span className="truncate text-fg">{s.title}</span>
                      {s.isOptional ? <span className="ms-auto text-caption text-fg-subtle">optional</span> : null}
                    </li>
                  ))}
                  {p.steps.length > 6 ? <li className="ps-9 text-caption text-fg-subtle">+{p.steps.length - 6} more</li> : null}
                </ol>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Events ─────────────
export interface EventItem {
  id: string;
  slug: string;
  title: string;
  startsAt: Date;
  location?: string | null;
  isOnline: boolean;
  cover?: { url: string; alt?: string | null } | null;
  campus?: { city: string } | null;
}

export function EventsSection({ data, events }: { data: { title?: string; subtitle?: string }; events: EventItem[] }) {
  if (!events.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Events" title={data.title ?? "Upcoming events"} subtitle={data.subtitle} />
        <RevealGroup className="grid gap-4 md:grid-cols-3">
          {events.map((e) => (
            <RevealItem key={e.id}>
              <Link href={`/events/${e.slug}`} className="group surface surface-hover flex h-full flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <span className="text-caption uppercase">{formatDate(e.startsAt, { month: "short" })}</span>
                    <span className="text-h3 leading-none">{formatDate(e.startsAt, { day: "numeric" })}</span>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-h4 line-clamp-2 text-fg group-hover:text-accent">{e.title}</h3>
                    <span className="inline-flex items-center gap-1 text-caption text-fg-muted">
                      {e.isOnline ? <CalendarDays className="size-3.5" /> : <MapPin className="size-3.5" />}
                      {e.isOnline ? "Online" : (e.location ?? e.campus?.city ?? "Campus")} · {formatDate(e.startsAt, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

// ───────────── Success stories ─────────────
export interface StoryItem {
  id: string;
  slug: string;
  name: string;
  headline: string;
  outcome?: string | null;
  courseTitle?: string | null;
  cover?: { url: string; alt?: string | null } | null;
}

export function SuccessStoriesSection({ data, stories }: { data: { title?: string; subtitle?: string }; stories: StoryItem[] }) {
  if (!stories.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Success stories" title={data.title ?? "From first lesson to first client"} subtitle={data.subtitle} />
        <RevealGroup className="grid gap-5 md:grid-cols-3">
          {stories.map((s) => (
            <RevealItem key={s.id}>
              <Link href={`/success-stories/${s.slug}`} className="group surface surface-hover flex h-full flex-col overflow-hidden">
                <div className="aspect-[4/3] w-full overflow-hidden bg-bg-muted">
                  <CourseArtwork artworkKey="freelancing" seed={s.slug} title={s.name} imageUrl={s.cover?.url} alt={s.cover?.alt} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  {s.outcome ? <Badge variant="success">{s.outcome}</Badge> : null}
                  <h3 className="text-h4 text-fg group-hover:text-accent">{s.headline}</h3>
                  <p className="text-caption text-fg-muted">
                    {s.name}
                    {s.courseTitle ? ` · ${s.courseTitle}` : ""}
                  </p>
                </div>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
