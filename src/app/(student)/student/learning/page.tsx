import type { Metadata } from "next";
import Link from "next/link";
import { Check, Circle, ArrowRight, Route } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { cn, toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Learning roadmap" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  const { studentId } = await requireStudentProfile();
  const enrollments = await prisma.enrollment.findMany({ where: { studentId }, select: { courseId: true, status: true, progress: { select: { percent: true } } } });
  const byCourse = new Map(enrollments.map((e) => [e.courseId, e]));
  const paths = await prisma.learningPath.findMany({
    where: { status: "PUBLISHED", steps: { some: { courseId: { in: enrollments.map((e) => e.courseId) } } } },
    include: { steps: { orderBy: { order: "asc" }, include: { course: { select: { id: true, slug: true, title: true, status: true } } } } },
  });
  const suggested = paths.length ? [] : await prisma.learningPath.findMany({ where: { status: "PUBLISHED", featured: true }, take: 3, include: { steps: { orderBy: { order: "asc" }, include: { course: { select: { id: true, slug: true, title: true, status: true } } } } } });

  const render = (path: (typeof paths)[number], enrolledView: boolean) => {
    const firstIncomplete = path.steps.findIndex((s) => !s.courseId || byCourse.get(s.courseId)?.status !== "COMPLETED");
    const done = path.steps.filter((s) => s.courseId && byCourse.get(s.courseId)?.status === "COMPLETED").length;
    return (
      <section key={path.id} className="surface p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            {path.careerGoal ? <p className="text-label text-accent">{path.careerGoal}</p> : null}
            <h2 className="text-h3">{path.title}</h2>
            {path.description ? <p className="mt-1 max-w-2xl text-body-sm text-fg-muted">{path.description}</p> : null}
          </div>
          <div className="w-40">
            <p className="mb-1 text-end text-caption text-fg-muted">{done}/{path.steps.length} steps</p>
            <Progress value={path.steps.length ? (done / path.steps.length) * 100 : 0} tone="gradient" />
          </div>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {path.steps.map((s, i) => {
            const e = s.courseId ? byCourse.get(s.courseId) : undefined;
            const state = e?.status === "COMPLETED" ? "completed" : i === firstIncomplete || e?.status === "ACTIVE" ? "current" : "upcoming";
            return (
              <li key={s.id} className={cn("flex flex-col gap-3 rounded-lg border p-4", state === "current" ? "border-accent/40 bg-accent-soft/30" : "border-border")}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", state === "completed" ? "bg-success text-white" : state === "current" ? "bg-accent text-white" : "bg-bg-muted text-fg-subtle")}>{state === "completed" ? <Check className="size-4" /> : state === "current" ? <Circle className="size-2.5 fill-current" /> : i + 1}</span>
                  <p className="min-w-0 flex-1 truncate font-medium">{s.title}</p>
                  <Badge variant={state === "completed" ? "success" : state === "current" ? "accent" : "default"}>{state}</Badge>
                </div>
                {s.course ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-caption text-fg-muted">{s.course.title}{e?.progress ? ` · ${Math.round(toNumber(e.progress.percent))}%` : ""}</span>
                    <Button asChild size="sm" variant={state === "current" ? "primary" : "ghost"}>
                      <Link href={e ? `/student/course/${s.course.id}` : `/courses/${s.course.slug}`}>{e ? "Continue" : "View"} <ArrowRight className="rtl:rotate-180" /></Link>
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {!enrolledView ? <p className="mt-4 text-caption text-fg-subtle">Suggested path — enroll in the first course to start it.</p> : null}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Your learning roadmap" description="Completed, current and upcoming steps across your paths." />
      {paths.length ? paths.map((p) => render(p, true)) : suggested.length ? suggested.map((p) => render(p, false)) : <EmptyState icon={<Route />} title="No roadmap yet." description="Enroll in a course that belongs to a learning path and your roadmap appears here." action={<Button asChild><Link href="/learning-paths">Explore paths</Link></Button>} />}
    </div>
  );
}
