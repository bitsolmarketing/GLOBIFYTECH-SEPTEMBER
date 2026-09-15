import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, ClipboardList, CreditCard, Sparkles, ArrowRight, Megaphone, ListChecks, Award } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getStudentCockpit } from "@/server/services/students";
import { CurrentCourseCard, StreakTile, WeekTile, LessonsTile, ProjectsTile, CertificatesTile } from "@/components/lms/dashboard-widgets";
import { CourseCard } from "@/components/lms/course-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatMoney, relativeTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireUser();
  const [c, t] = await Promise.all([getStudentCockpit(user.id), getTranslations("student")]);
  const greeting = t("greeting", { period: c.greeting, name: c.student.firstName });

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1">{greeting}</h1>
        <p className="text-body text-fg-muted">{t("greetingSub")}</p>
      </header>

      {c.current ? (
        <CurrentCourseCard course={c.current.course} progress={c.current.progress} lessonsCompleted={c.current.lessonsCompleted} lessonsTotal={c.current.lessonsTotal} nextLesson={c.nextLesson ? { id: c.nextLesson.id, title: c.nextLesson.title, type: c.nextLesson.type, durationSeconds: c.nextLesson.durationSeconds, moduleTitle: c.nextLesson.moduleTitle } : null} batch={c.current.batch} labels={{ current: t("currentCourse"), next: t("nextLesson"), resume: t("resume") }} />
      ) : (
        <EmptyState icon={<Sparkles />} title={t("noCourses")} description="Pick a course and your learning cockpit lights up." action={<Button asChild><Link href="/courses">{t("browse")}</Link></Button>} />
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StreakTile current={c.streak.current} longest={c.streak.longest} />
        <WeekTile minutes={c.weekMinutes} />
        <LessonsTile count={c.stats.lessonsCompleted} />
        <ProjectsTile count={c.stats.projectsApproved} />
        <CertificatesTile count={c.stats.certificates} />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-7">
          <div className="flex items-end justify-between">
            <h2 className="text-h4">{t("upcoming")}</h2>
            <Link href="/student/calendar" className="text-body-sm text-accent hover:underline">{t("nav.calendar")}</Link>
          </div>
          {c.upcomingClasses.length || c.dueAssignments.length || c.invoicesDue.length ? (
            <ul className="surface divide-y divide-border">
              {c.upcomingClasses.map((lc) => (
                <li key={lc.id} className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent"><CalendarDays className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{lc.title}</p>
                    <p className="text-caption text-fg-muted">{lc.course.title} · {formatDateTime(lc.startsAt)}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary"><Link href="/student/live-classes">Details</Link></Button>
                </li>
              ))}
              {c.dueAssignments.map((a) => (
                <li key={a.id} className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-warning-soft text-warning"><ClipboardList className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.title}</p>
                    <p className="text-caption text-fg-muted">{a.course.title} · due {a.dueAt ? relativeTime(a.dueAt) : "soon"}</p>
                  </div>
                  <Button asChild size="sm" variant="secondary"><Link href={`/student/assignments/${a.id}`}>Open</Link></Button>
                </li>
              ))}
              {c.invoicesDue.map((i) => (
                <li key={i.id} className="flex items-center gap-3 p-4">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-danger-soft text-danger"><CreditCard className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">Invoice {i.number} · {formatMoney(i.balance)}</p>
                    <p className="text-caption text-fg-muted">{i.status === "OVERDUE" ? "Overdue" : `Due ${i.dueDate ? relativeTime(i.dueDate) : "soon"}`}</p>
                  </div>
                  <Button asChild size="sm"><Link href={`/student/payments/${i.id}`}>Pay</Link></Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact title={t("noDeadlines")} description="Nothing is due in the next two weeks." />
          )}
          {c.openQuizzes > 0 ? (
            <Link href="/student/quizzes" className="surface surface-hover flex items-center gap-3 p-4">
              <ListChecks className="size-5 text-accent" />
              <span className="flex-1 text-sm">{c.openQuizzes} quiz{c.openQuizzes === 1 ? "" : "zes"} waiting for you</span>
              <ArrowRight className="size-4 text-fg-subtle rtl:rotate-180" />
            </Link>
          ) : null}
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-5">
          <Link href="/student/ai" className="group relative overflow-hidden rounded-xl p-5 text-white gradient-brand">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(400px_200px_at_100%_0%,rgba(255,255,255,.3),transparent)]" aria-hidden />
            <div className="relative flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5" />
              <div>
                <p className="font-semibold">{t("askAI")}</p>
                <p className="text-body-sm text-white/85">Explain a lesson, quiz me, or ask what to learn next.</p>
              </div>
              <ArrowRight className="ms-auto size-5 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
            </div>
          </Link>
          {c.announcements.length ? (
            <div className="surface flex flex-col gap-3 p-5">
              <p className="inline-flex items-center gap-2 text-label text-fg-subtle"><Megaphone className="size-3.5" /> Announcements</p>
              {c.announcements.map((a) => (
                <div key={a.id} className="flex flex-col gap-0.5">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-caption text-fg-muted">{relativeTime(a.publishedAt)}</p>
                </div>
              ))}
            </div>
          ) : null}
          {c.badges.length ? (
            <div className="surface flex flex-col gap-3 p-5">
              <p className="inline-flex items-center gap-2 text-label text-fg-subtle"><Award className="size-3.5" /> Badges</p>
              <div className="flex flex-wrap gap-1.5">
                {c.badges.map((b) => (
                  <Badge key={b.id} variant="purple">{b.name}</Badge>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      {c.enrollments.length > 1 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-end justify-between">
            <h2 className="text-h4">{t("nav.courses")}</h2>
            <Link href="/student/courses" className="text-body-sm text-accent hover:underline">View all</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.enrollments.slice(0, 3).map((e) => (
              <CourseCard key={e.id} course={{ ...e.course, level: "BEGINNER", ratingAvg: 0 }} href={`/student/course/${e.course.id}`} progress={e.progress} compact />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
