import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { orderedLessons } from "@/server/services/courses";
import { nextLessonFor } from "@/server/services/progress";
import { evaluateEnrollment } from "@/server/services/completion";
import { isAiConfigured } from "@/server/ai/provider";
import { CoursePlayer, type PlayerLesson } from "@/components/lms/course-player";
import { hoursAgo, toNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({ where: { id }, select: { title: true } });
  return { title: course?.title ?? "Course" };
}

export default async function CoursePlayerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lesson?: string; tab?: string }> }) {
  const [{ id }, sp, { studentId }] = await Promise.all([params, searchParams, requireStudentProfile()]);
  const enrollment = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId: id } }, include: { progress: true, course: { select: { id: true, slug: true, title: true, leaderboardEnabled: true, instructors: { include: { instructor: { include: { user: { select: { id: true, name: true, avatar: { select: { url: true } } } } } } } } } }, completion: true, certificate: { select: { id: true, certificateNumber: true } } } });
  if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) notFound();

  const { modules, flat } = await orderedLessons(id);
  if (!flat.length) notFound();
  const lessonId = sp.lesson && flat.some((l) => l.id === sp.lesson) ? sp.lesson : ((await nextLessonFor(enrollment.id))?.id ?? flat[0]!.id);
  const [lesson, lessonProgress, videoProgress, notes, bookmarks, discussions, evaluation, invoiceBlock] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId }, include: { video: true, resources: { orderBy: { order: "asc" }, include: { media: true } }, quiz: { select: { id: true, title: true, attempts: { where: { studentId }, orderBy: { startedAt: "desc" }, take: 1 } } }, assignment: { select: { id: true, title: true, dueAt: true, submissions: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } }, project: { select: { id: true, title: true, deadline: true, submissions: { where: { studentId }, orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } } }, liveClasses: { where: { startsAt: { gte: hoursAgo(3) } }, orderBy: { startsAt: "asc" }, take: 1 } } }),
    prisma.lessonProgress.findMany({ where: { enrollmentId: enrollment.id }, select: { lessonId: true, status: true } }),
    prisma.videoProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId } } }),
    prisma.lessonNote.findMany({ where: { studentId, lessonId }, orderBy: { createdAt: "desc" } }),
    prisma.lessonBookmark.findMany({ where: { studentId, lessonId }, orderBy: { timestampSeconds: "asc" } }),
    prisma.discussion.findMany({ where: { lessonId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20, include: { author: { select: { name: true, avatar: { select: { url: true } } } }, _count: { select: { replies: true } } } }),
    evaluateEnrollment(enrollment.id),
    prisma.invoice.findFirst({ where: { enrollmentId: enrollment.id, status: "OVERDUE", deletedAt: null }, select: { id: true, number: true } }),
  ]);
  if (!lesson) notFound();

  const progressMap = new Map(lessonProgress.map((p) => [p.lessonId, p.status]));
  const curriculum = modules.map((m) => ({ id: m.id, title: m.title, units: m.units.map((u) => ({ id: u.id, title: u.title, lessons: u.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, durationSeconds: l.durationSeconds, status: progressMap.get(l.id) ?? "NOT_STARTED" })) })) }));
  const idx = flat.findIndex((l) => l.id === lessonId);
  const playerLesson: PlayerLesson = {
    id: lesson.id,
    title: lesson.title,
    type: lesson.type,
    content: lesson.content,
    objectives: lesson.objectives,
    durationSeconds: lesson.durationSeconds,
    videoUrl: lesson.video?.url ?? lesson.videoUrl ?? null,
    resources: lesson.resources.map((r) => ({ id: r.id, title: r.title, type: r.type, url: r.media?.url ?? r.url ?? null })),
    quiz: lesson.quiz ? { id: lesson.quiz.id, title: lesson.quiz.title, lastAttempt: lesson.quiz.attempts[0] ? { status: lesson.quiz.attempts[0].status, percent: toNumber(lesson.quiz.attempts[0].percent), passed: lesson.quiz.attempts[0].passed } : null } : null,
    assignment: lesson.assignment ? { id: lesson.assignment.id, title: lesson.assignment.title, dueAt: lesson.assignment.dueAt?.toISOString() ?? null, status: lesson.assignment.submissions[0]?.status ?? null } : null,
    project: lesson.project ? { id: lesson.project.id, title: lesson.project.title, deadline: lesson.project.deadline?.toISOString() ?? null, status: lesson.project.submissions[0]?.status ?? null } : null,
    liveClass: lesson.liveClasses[0] ? { id: lesson.liveClasses[0].id, title: lesson.liveClasses[0].title, startsAt: lesson.liveClasses[0].startsAt.toISOString(), status: lesson.liveClasses[0].status } : null,
    completed: progressMap.get(lesson.id) === "COMPLETED",
    prevId: flat[idx - 1]?.id ?? null,
    nextId: flat[idx + 1]?.id ?? null,
    moduleTitle: flat[idx]?.moduleTitle ?? "",
  };

  return (
    <CoursePlayer
      course={{ id: enrollment.course.id, slug: enrollment.course.slug, title: enrollment.course.title, instructor: enrollment.course.instructors[0]?.instructor.user ?? null }}
      curriculum={curriculum}
      lesson={playerLesson}
      progress={{ percent: toNumber(enrollment.progress?.percent ?? 0), completed: enrollment.progress?.lessonsCompleted ?? 0, total: enrollment.progress?.lessonsTotal ?? flat.length }}
      startAt={videoProgress?.positionSeconds ?? 0}
      notes={notes.map((n) => ({ id: n.id, body: n.body, timestampSeconds: n.timestampSeconds, createdAt: n.createdAt.toISOString() }))}
      bookmarks={bookmarks.map((b) => ({ id: b.id, timestampSeconds: b.timestampSeconds, label: b.label }))}
      discussions={discussions.map((d) => ({ id: d.id, title: d.title, author: d.author.name, replies: d._count.replies, isResolved: d.isResolved, createdAt: d.createdAt.toISOString() }))}
      completion={{ complete: !!enrollment.completion, readiness: evaluation.readinessPercent, requirements: evaluation.requirements, certificate: enrollment.certificate }}
      aiEnabled={isAiConfigured()}
      overdueInvoice={invoiceBlock}
      initialTab={sp.tab}
    />
  );
}
