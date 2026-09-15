import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Circle, Lock } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSession, getStudentProfileId } from "@/server/auth/session";
import { PageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { buildMetadata } from "@/lib/seo";
import { cn, toNumber } from "@/lib/utils";

export const revalidate = 300;

async function getPath(slug: string) {
  return prisma.learningPath.findFirst({ where: { slug, status: "PUBLISHED" }, include: { steps: { orderBy: { order: "asc" }, include: { course: { select: { id: true, slug: true, title: true, subtitle: true, durationWeeks: true, level: true, status: true } } } } } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPath(slug);
  if (!p) return {};
  return buildMetadata({ title: p.title, description: p.description, path: `/learning-paths/${slug}` });
}

export default async function LearningPathPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [path, session] = await Promise.all([getPath(slug), getSession()]);
  if (!path) notFound();
  const studentId = session ? await getStudentProfileId(session.id) : null;
  const enrollments = studentId ? await prisma.enrollment.findMany({ where: { studentId, courseId: { in: path.steps.map((s) => s.courseId).filter((x): x is string => !!x) } }, select: { courseId: true, status: true, progress: { select: { percent: true } } } }) : [];
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const firstIncomplete = path.steps.findIndex((s) => !s.courseId || byCourse.get(s.courseId)?.status !== "COMPLETED");

  return (
    <>
      <PageHero eyebrow={path.careerGoal ?? "Learning path"} title={path.title} description={path.description} crumbs={[{ label: "Learning paths", href: "/learning-paths" }, { label: path.title }]} />
      <div className="container-x py-12 md:py-16">
        <ol className="relative mx-auto flex max-w-3xl flex-col gap-0">
          {path.steps.map((s, i) => {
            const e = s.courseId ? byCourse.get(s.courseId) : undefined;
            const state: "completed" | "current" | "upcoming" = e?.status === "COMPLETED" ? "completed" : i === firstIncomplete || (e && e.status === "ACTIVE") ? "current" : "upcoming";
            const last = i === path.steps.length - 1;
            return (
              <li key={s.id} className="relative flex gap-5 pb-8">
                {!last ? <span className={cn("absolute start-[19px] top-10 h-[calc(100%-24px)] w-0.5", state === "completed" ? "bg-success" : "bg-border")} aria-hidden /> : null}
                <span className={cn("relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold", state === "completed" ? "border-success bg-success text-white" : state === "current" ? "border-accent bg-accent-soft text-accent shadow-glow" : "border-border bg-surface text-fg-subtle")}>
                  {state === "completed" ? <Check className="size-5" /> : state === "current" ? <Circle className="size-3 fill-current" /> : i + 1}
                </span>
                <div className={cn("surface flex flex-1 flex-col gap-3 p-5", state === "current" && "border-accent/40")}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-label text-fg-subtle">Step {i + 1}{s.isOptional ? " · optional" : ""}</p>
                      <h2 className="text-h4 text-fg">{s.title}</h2>
                    </div>
                    <Badge variant={state === "completed" ? "success" : state === "current" ? "accent" : "default"}>{state === "completed" ? "Completed" : state === "current" ? "Current" : "Upcoming"}</Badge>
                  </div>
                  {s.description ? <p className="text-body-sm text-fg-muted">{s.description}</p> : null}
                  {s.course && s.course.status === "PUBLISHED" ? (
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                      <div className="text-body-sm text-fg-muted">
                        <span className="font-medium text-fg">{s.course.title}</span>
                        {s.course.durationWeeks ? ` · ${s.course.durationWeeks} weeks` : ""}
                        {e?.progress ? ` · ${Math.round(toNumber(e.progress.percent))}% done` : ""}
                      </div>
                      <Button asChild size="sm" variant={state === "current" ? "primary" : "secondary"}>
                        <Link href={e ? `/student/course/${s.course.id}` : `/courses/${s.course.slug}`}>
                          {e ? "Continue" : "View course"} <ArrowRight className="rtl:rotate-180" />
                        </Link>
                      </Button>
                    </div>
                  ) : s.courseId ? (
                    <p className="inline-flex items-center gap-1.5 text-caption text-fg-subtle">
                      <Lock className="size-3.5" /> Course coming soon
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}
