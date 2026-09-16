import Link from "next/link";
import { Flame, Clock, BookOpenCheck, FolderKanban, Award, ArrowRight, PlayCircle, type LucideProps } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { Button } from "@/components/ui/button";

export function StatTile({ icon: Icon, label, value, hint, tone = "default", className }: { icon: React.ComponentType<LucideProps>; label: string; value: React.ReactNode; hint?: string; tone?: "default" | "accent" | "success" | "warning"; className?: string }) {
  const tones = { default: "bg-bg-muted text-fg-muted", accent: "bg-accent-soft text-accent", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning" };
  return (
    <div className={cn("surface flex items-center gap-4 p-4", className)}>
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-caption text-fg-muted">{label}</p>
        <p className="text-h4 truncate tabular-nums text-fg">{value}</p>
        {hint ? <p className="text-caption text-fg-subtle">{hint}</p> : null}
      </div>
    </div>
  );
}

export function StreakTile({ current, longest }: { current: number; longest: number }) {
  return <StatTile icon={Flame} label="Learning streak" value={`${current} day${current === 1 ? "" : "s"}`} hint={`Best: ${longest}`} tone={current > 0 ? "warning" : "default"} />;
}

export function WeekTile({ minutes }: { minutes: number }) {
  return <StatTile icon={Clock} label="This week" value={formatDuration(minutes * 60)} hint="Learning time" tone="accent" />;
}

export function LessonsTile({ count }: { count: number }) {
  return <StatTile icon={BookOpenCheck} label="Lessons completed" value={count} />;
}

export function ProjectsTile({ count }: { count: number }) {
  return <StatTile icon={FolderKanban} label="Projects approved" value={count} tone={count > 0 ? "success" : "default"} />;
}

export function CertificatesTile({ count }: { count: number }) {
  return <StatTile icon={Award} label="Certificates" value={count} tone={count > 0 ? "success" : "default"} />;
}

export interface CurrentCourseProps {
  course: { id: string; slug: string; title: string; artwork?: { url: string } | null; category?: { artworkKey: string; name: string } | null };
  progress: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  nextLesson: { id: string; title: string; type: string; durationSeconds: number; moduleTitle: string } | null;
  batch?: { code: string; name: string } | null;
  labels: { current: string; next: string; resume: string };
}

export function CurrentCourseCard({ course, progress, lessonsCompleted, lessonsTotal, nextLesson, batch, labels }: CurrentCourseProps) {
  const href = nextLesson ? `/student/course/${course.id}?lesson=${nextLesson.id}` : `/student/course/${course.id}`;
  return (
    <div className="surface-raised relative overflow-hidden">
      <div className="grid md:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-label text-accent">{labels.current}</p>
              <h2 className="text-h3 mt-1 truncate text-fg">{course.title}</h2>
              <p className="text-body-sm text-fg-muted">
                {course.category?.name}
                {batch ? ` · ${batch.name}` : ""} · {lessonsCompleted}/{lessonsTotal} lessons
              </p>
            </div>
            <ProgressRing value={progress} size={72} stroke={7} tone="gradient" />
          </div>
          {nextLesson ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg-subtle p-4 sm:flex-row sm:items-center">
              <PlayCircle className="size-8 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-caption text-fg-muted">{labels.next} · {nextLesson.moduleTitle}</p>
                <p className="truncate font-medium text-fg">{nextLesson.title}</p>
                <p className="text-caption text-fg-subtle">
                  {nextLesson.type.toLowerCase()}
                  {nextLesson.durationSeconds ? ` · ${formatDuration(nextLesson.durationSeconds)}` : ""}
                </p>
              </div>
              <Button asChild>
                <Link href={href}>
                  {labels.resume} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-success-soft p-4 text-sm text-success">You’ve completed every lesson. Check your assessments and certificate.</div>
          )}
        </div>
        <div className="relative hidden md:block">
          <CourseArtwork artworkKey={course.category?.artworkKey} seed={course.slug} title={course.title} imageUrl={course.artwork?.url} />
        </div>
      </div>
    </div>
  );
}
