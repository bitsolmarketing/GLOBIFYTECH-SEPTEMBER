import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Check, Clock, PlayCircle, Star, Users, BarChart3, Globe, Lock, FileText, ListChecks, FolderKanban, Video } from "lucide-react";
import { getPublicCourseBySlug } from "@/server/services/courses";
import { getSession, getStudentProfileId } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { buildMetadata, breadcrumbJsonLd, courseJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { EnrollCta } from "@/components/marketing/enroll-cta";
import { LeadForm } from "@/components/marketing/lead-form";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { formatDuration, enumLabel, toNumber, formatDate } from "@/lib/utils";
import { Reveal } from "@/components/marketing/motion";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = await getPublicCourseBySlug(slug);
  if (!course) return {};
  return buildMetadata({ title: course.seoTitle ?? course.title, description: course.seoDescription ?? course.shortDescription ?? course.subtitle, path: `/courses/${slug}`, image: course.ogImage?.url ?? course.artwork?.url ?? null, noindex: course.noindex });
}

const lessonIcon = { VIDEO: Video, TEXT: FileText, LIVE: Video, QUIZ: ListChecks, ASSIGNMENT: FileText, PROJECT: FolderKanban, RESOURCE: FileText } as const;

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [course, session, t] = await Promise.all([getPublicCourseBySlug(slug), getSession(), getTranslations("courses")]);
  if (!course) notFound();
  const studentId = session ? await getStudentProfileId(session.id) : null;
  const enrolled = studentId ? !!(await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: course.id } }, select: { id: true } })) : false;

  const lessons = course.modules.flatMap((m) => m.units.flatMap((u) => u.lessons));
  const totalSeconds = lessons.reduce((s, l) => s + l.durationSeconds, 0);
  const lead = course.instructors.find((i) => i.isLead)?.instructor ?? course.instructors[0]?.instructor;
  const faqs = (course.faqs as Array<{ question: string; answer: string }> | null) ?? [];
  const price = toNumber(course.price);
  const discount = course.discountPrice != null ? toNumber(course.discountPrice) : null;

  return (
    <article>
      <JsonLd data={[courseJsonLd({ title: course.title, description: course.shortDescription ?? course.subtitle, slug: course.slug, price: discount ?? price, currency: course.currency, instructors: course.instructors.map((i) => i.instructor.user.name), ratingAvg: toNumber(course.ratingAvg), ratingCount: course.ratingCount, durationWeeks: course.durationWeeks, mode: course.mode }), breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Courses", path: "/courses" }, { name: course.title, path: `/courses/${course.slug}` }])]} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-bg-subtle">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="container-x relative grid gap-10 py-12 md:py-16 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, ...(course.category ? [{ label: course.category.name, href: `/courses?category=${course.category.slug}` }] : []), { label: course.title }]} />
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">{enumLabel(course.level)}</Badge>
                <Badge>{enumLabel(course.mode)}</Badge>
                {course.featured ? <Badge variant="purple">Featured</Badge> : null}
              </div>
              <h1 className="text-h1 text-fg">{course.title}</h1>
              {course.subtitle ? <p className="text-body-lg text-fg-muted">{course.subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-body-sm text-fg-muted">
              {course.ratingCount ? (
                <span className="inline-flex items-center gap-1.5">
                  <Star className="size-4 fill-warning text-warning" /> <span className="font-medium text-fg">{toNumber(course.ratingAvg).toFixed(1)}</span> ({course.ratingCount} reviews)
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-4" /> {course.studentCount.toLocaleString()} students
              </span>
              {course.durationWeeks ? (
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4" /> {course.durationWeeks} weeks{course.hoursPerWeek ? ` · ${course.hoursPerWeek} h/week` : ""}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <BarChart3 className="size-4" /> {lessons.length} lessons · {formatDuration(totalSeconds)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe className="size-4" /> {course.language === "en" ? "English + Urdu" : course.language}
              </span>
            </div>
            {lead ? (
              <Link href={`/instructors/${lead.slug}`} className="flex w-fit items-center gap-3 rounded-full border border-border bg-surface py-1 pe-4 ps-1 text-sm transition-colors hover:border-border-strong">
                <Avatar name={lead.user.name} src={lead.user.avatar?.url} size="sm" />
                <span>
                  <span className="text-fg-muted">Taught by </span>
                  <span className="font-medium text-fg">{lead.user.name}</span>
                </span>
              </Link>
            ) : null}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-md lg:hidden">
              <CourseArtwork artworkKey={course.category?.artworkKey} seed={course.slug} title={course.title} imageUrl={course.artwork?.url} alt={course.artwork?.alt} />
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="relative mb-5 hidden aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-md lg:block">
              <CourseArtwork artworkKey={course.category?.artworkKey} seed={course.slug} title={course.title} imageUrl={course.artwork?.url} alt={course.artwork?.alt} />
              {course.promoVideo ? (
                <a href={course.promoVideo.url} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center bg-black/20 text-white transition-colors hover:bg-black/30" aria-label="Play preview">
                  <PlayCircle className="size-16 drop-shadow" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="container-x grid gap-12 py-12 md:py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-14 lg:col-span-7">
          {course.outcomes.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("whatYouLearn")}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-body text-fg-muted">
                    <Check className="mt-1 size-4 shrink-0 text-success" /> {o}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {course.description ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">About this course</h2>
              <div className="prose-globify" dangerouslySetInnerHTML={{ __html: course.description }} />
            </Reveal>
          ) : null}

          {course.modules.length ? (
            <Reveal as="section">
              <div className="mb-5 flex items-end justify-between">
                <h2 className="text-h2 text-fg">{t("curriculum")}</h2>
                <span className="text-body-sm text-fg-muted">
                  {course.modules.length} modules · {lessons.length} lessons
                </span>
              </div>
              <Accordion type="multiple" defaultValue={[course.modules[0]?.id ?? ""]} className="surface divide-y divide-border px-5">
                {course.modules.map((m, mi) => (
                  <AccordionItem key={m.id} value={m.id}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-3">
                        <span className="text-caption text-fg-subtle">{String(mi + 1).padStart(2, "0")}</span>
                        <span>{m.title}</span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      {m.description ? <p className="mb-3">{m.description}</p> : null}
                      <ul className="flex flex-col divide-y divide-border">
                        {m.units.flatMap((u) =>
                          u.lessons.map((l) => {
                            const Icon = lessonIcon[l.type] ?? FileText;
                            return (
                              <li key={l.id} className="flex items-center gap-3 py-2.5">
                                <Icon className="size-4 shrink-0 text-fg-subtle" />
                                <span className="flex-1 text-fg">{l.title}</span>
                                {l.isPreview ? <Badge variant="accent">{t("preview")}</Badge> : <Lock className="size-3.5 text-fg-subtle" />}
                                {l.durationSeconds ? <span className="w-12 text-end text-caption tabular-nums text-fg-subtle">{formatDuration(l.durationSeconds)}</span> : null}
                              </li>
                            );
                          }),
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          ) : null}

          {course.projects.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("projects")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {course.projects.map((p) => (
                  <div key={p.id} className="surface flex flex-col gap-2 p-5">
                    <FolderKanban className="size-5 text-accent" />
                    <h3 className="text-h4 text-fg">{p.title}</h3>
                    {p.overview ? <p className="text-body-sm text-fg-muted">{p.overview}</p> : null}
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      {p.skills.slice(0, 4).map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          {course.skills.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("skills")}</h2>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((s) => (
                  <Link key={s.skill.id} href={`/courses?skill=${s.skill.slug}`}>
                    <Badge variant="outline" className="px-3 py-1 text-sm hover:border-accent hover:text-accent">
                      {s.skill.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Reveal>
          ) : null}

          {course.instructors.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("instructors")}</h2>
              <div className="flex flex-col gap-4">
                {course.instructors.map(({ instructor }) => (
                  <Link key={instructor.id} href={`/instructors/${instructor.slug}`} className="surface surface-hover flex gap-4 p-5">
                    <Avatar name={instructor.user.name} src={instructor.user.avatar?.url} size="lg" />
                    <div className="flex flex-col gap-1">
                      <h3 className="text-h4 text-fg">{instructor.user.name}</h3>
                      {instructor.title ? <p className="text-body-sm text-fg-muted">{instructor.title}</p> : null}
                      {instructor.bio ? <p className="text-body-sm line-clamp-3 text-fg-muted">{instructor.bio}</p> : null}
                    </div>
                  </Link>
                ))}
              </div>
            </Reveal>
          ) : null}

          {course.careerOutcomes.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("careerOutcomes")}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.careerOutcomes.map((o) => (
                  <li key={o} className="surface flex items-center gap-3 p-4 text-sm font-medium text-fg">
                    <span className="size-2 rounded-full bg-accent-2" /> {o}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}

          {course.reviews.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("reviews")}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {course.reviews.map((r) => (
                  <figure key={r.id} className="surface flex flex-col gap-3 p-5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={i < r.rating ? "size-3.5 fill-warning text-warning" : "size-3.5 text-border-strong"} />
                      ))}
                    </div>
                    {r.title ? <p className="font-medium text-fg">{r.title}</p> : null}
                    {r.body ? <blockquote className="text-body-sm text-fg-muted">{r.body}</blockquote> : null}
                    <figcaption className="mt-auto flex items-center gap-2 text-caption text-fg-muted">
                      <Avatar name={r.student.user.name} src={r.student.user.avatar?.url} size="xs" /> {r.student.user.name} · {formatDate(r.createdAt)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Reveal>
          ) : null}

          {faqs.length ? (
            <Reveal as="section">
              <h2 className="text-h2 mb-5 text-fg">{t("faq")}</h2>
              <Accordion type="single" collapsible className="surface divide-y divide-border px-5">
                {faqs.map((f, i) => (
                  <AccordionItem key={i} value={String(i)}>
                    <AccordionTrigger>{f.question}</AccordionTrigger>
                    <AccordionContent>{f.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-5 lg:ps-6">
          <EnrollCta
            courseId={course.id}
            slug={course.slug}
            signedIn={!!session}
            enrolled={enrolled}
            price={price}
            discountPrice={discount}
            currency={course.currency}
            batches={course.batches.map((b) => ({ id: b.id, code: b.code, name: b.name, startDate: b.startDate, mode: b.mode, seatsLeft: Math.max(0, b.capacity - b._count.students), schedule: b.schedule }))}
            feePlans={course.feePlans.map((p) => ({ id: p.id, name: p.name, totalAmount: toNumber(p.totalAmount), installments: p.installments.length, isDefault: p.isDefault }))}
            labels={{ enroll: t("enroll"), continue: t("continue"), apply: t("apply") }}
          />
          {!enrolled ? (
            <div className="surface p-6">
              <h3 className="text-h4 mb-1 text-fg">Not sure yet?</h3>
              <p className="mb-4 text-body-sm text-fg-muted">Get a call from a counsellor about batches, fees and whether this course fits your goals.</p>
              <LeadForm courseId={course.id} courseTitle={course.title} compact />
            </div>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
