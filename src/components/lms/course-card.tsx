import Link from "next/link";
import { Clock, Star, Users } from "lucide-react";
import { cn, formatMoney, formatNumber, toNumber, enumLabel } from "@/lib/utils";
import { CourseArtwork } from "@/components/marketing/course-artwork";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface CourseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    subtitle?: string | null;
    level: string;
    durationWeeks?: number | null;
    price?: number | string | { toString(): string } | null;
    discountPrice?: number | string | { toString(): string } | null;
    currency?: string;
    ratingAvg?: number | string | { toString(): string };
    ratingCount?: number;
    studentCount?: number;
    artwork?: { url: string; alt?: string | null } | null;
    category?: { name: string; artworkKey: string } | null;
    instructors?: Array<{ isLead?: boolean; instructor: { user: { name: string; avatar?: { url: string } | null } } }>;
  };
  href?: string;
  progress?: number | null;
  ctaLabel?: string;
  className?: string;
  compact?: boolean;
}

export function CourseCard({ course, href, progress, className, compact }: CourseCardProps) {
  const lead = course.instructors?.find((i) => i.isLead)?.instructor ?? course.instructors?.[0]?.instructor;
  const rating = toNumber(course.ratingAvg ?? 0);
  const price = toNumber(course.price ?? 0);
  const discount = course.discountPrice != null ? toNumber(course.discountPrice) : null;
  const to = href ?? `/courses/${course.slug}`;
  return (
    <Link
      href={to}
      className={cn("group surface surface-hover flex flex-col overflow-hidden focus-visible:outline-2 focus-visible:outline-accent", className)}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-bg-muted">
        <CourseArtwork artworkKey={course.category?.artworkKey} seed={course.slug} title={course.title} imageUrl={course.artwork?.url} alt={course.artwork?.alt} className="transition-transform duration-500 group-hover:scale-[1.03]" />
        <div className="absolute start-3 top-3 flex gap-1.5">
          <Badge variant="inverse" className="bg-black/55 text-white backdrop-blur">
            {enumLabel(course.level)}
          </Badge>
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col gap-3", compact ? "p-4" : "p-5")}>
        <div className="flex flex-col gap-1">
          {course.category ? <p className="text-label text-accent">{course.category.name}</p> : null}
          <h3 className="text-h4 line-clamp-2 text-fg group-hover:text-accent">{course.title}</h3>
          {!compact && course.subtitle ? <p className="text-body-sm line-clamp-2 text-fg-muted">{course.subtitle}</p> : null}
        </div>
        {lead ? (
          <div className="flex items-center gap-2 text-body-sm text-fg-muted">
            <Avatar name={lead.user.name} src={lead.user.avatar?.url} size="xs" />
            <span className="truncate">{lead.user.name}</span>
          </div>
        ) : null}
        {progress != null ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-caption text-fg-muted">
              <span>Progress</span>
              <span className="tabular-nums text-fg">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} size="sm" tone={progress >= 100 ? "success" : "accent"} />
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-caption text-fg-muted">
          <div className="flex items-center gap-3">
            {course.durationWeeks ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> {course.durationWeeks}w
              </span>
            ) : null}
            {rating > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-3.5 fill-warning text-warning" /> {rating.toFixed(1)}
              </span>
            ) : null}
            {course.studentCount ? (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {formatNumber(course.studentCount)}
              </span>
            ) : null}
          </div>
          {progress == null && price > 0 ? (
            <span className="text-sm font-semibold text-fg">
              {discount != null && discount < price ? (
                <>
                  <span className="me-1.5 text-caption font-normal text-fg-subtle line-through">{formatMoney(price, course.currency)}</span>
                  {formatMoney(discount, course.currency)}
                </>
              ) : (
                formatMoney(price, course.currency)
              )}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
