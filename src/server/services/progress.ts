import "server-only";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { requireEnrollment } from "./enrollments";
import { courseIdForLesson, orderedLessons } from "./courses";
import { evaluateAndCompleteIfReady } from "./completion";
import { awardBadge } from "./gamification";

function today(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Updates the daily streak for a user (called on any learning activity). */
export async function touchStreak(userId: string) {
  const t = today();
  const streak = await prisma.streak.upsert({ where: { userId }, update: {}, create: { userId } });
  if (streak.lastActiveDate && streak.lastActiveDate.getTime() === t.getTime()) return streak;
  const yesterday = new Date(t.getTime() - 86400000);
  const continues = streak.lastActiveDate && streak.lastActiveDate.getTime() === yesterday.getTime();
  const current = continues ? streak.current + 1 : 1;
  const updated = await prisma.streak.update({
    where: { userId },
    data: { current, longest: Math.max(streak.longest, current), lastActiveDate: t },
  });
  if (current === 7) await awardBadge(userId, "STREAK_7");
  if (current === 30) await awardBadge(userId, "STREAK_30");
  return updated;
}

export async function recordLearningTime(userId: string, seconds: number, lessons = 0) {
  if (seconds <= 0 && lessons <= 0) return;
  const t = today();
  await prisma.learningActivity.upsert({
    where: { userId_date: { userId, date: t } },
    update: { seconds: { increment: Math.max(0, seconds) }, lessons: { increment: lessons } },
    create: { userId, date: t, seconds: Math.max(0, seconds), lessons },
  });
}

/** Persist playback position; marks the lesson complete at ≥ 90%. */
export async function saveVideoProgress(params: { studentId: string; userId: string; lessonId: string; positionSeconds: number; percent: number; secondsWatched?: number }) {
  const courseId = await courseIdForLesson(params.lessonId);
  if (!courseId) throw AppError.notFound("Lesson");
  const enrollment = await requireEnrollment(params.studentId, courseId);
  await prisma.videoProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: params.lessonId } },
    update: { positionSeconds: params.positionSeconds, percent: Math.min(100, params.percent) },
    create: { enrollmentId: enrollment.id, lessonId: params.lessonId, positionSeconds: params.positionSeconds, percent: Math.min(100, params.percent) },
  });
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: params.lessonId } },
    update: { status: "IN_PROGRESS", secondsSpent: { increment: params.secondsWatched ?? 0 } },
    create: { enrollmentId: enrollment.id, lessonId: params.lessonId, status: "IN_PROGRESS", startedAt: new Date(), secondsSpent: params.secondsWatched ?? 0 },
  });
  await Promise.all([touchStreak(params.userId), recordLearningTime(params.userId, params.secondsWatched ?? 0)]);
  await prisma.courseProgress.update({ where: { enrollmentId: enrollment.id }, data: { lastLessonId: params.lessonId, lastActivityAt: new Date(), secondsSpent: { increment: params.secondsWatched ?? 0 } } });
  if (params.percent >= 90) await completeLesson({ studentId: params.studentId, userId: params.userId, lessonId: params.lessonId });
}

export async function startLesson(params: { studentId: string; userId: string; lessonId: string }) {
  const courseId = await courseIdForLesson(params.lessonId);
  if (!courseId) throw AppError.notFound("Lesson");
  const enrollment = await requireEnrollment(params.studentId, courseId);
  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: params.lessonId } },
    update: {},
    create: { enrollmentId: enrollment.id, lessonId: params.lessonId, status: "IN_PROGRESS", startedAt: new Date() },
  });
  await prisma.courseProgress.update({ where: { enrollmentId: enrollment.id }, data: { lastLessonId: params.lessonId, lastActivityAt: new Date() } });
  await touchStreak(params.userId);
}

/** Marks a lesson complete and recomputes course progress; triggers completion engine. */
export async function completeLesson(params: { studentId: string; userId: string; lessonId: string }) {
  const courseId = await courseIdForLesson(params.lessonId);
  if (!courseId) throw AppError.notFound("Lesson");
  const enrollment = await requireEnrollment(params.studentId, courseId);
  const existing = await prisma.lessonProgress.findUnique({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: params.lessonId } } });
  if (existing?.status === "COMPLETED") return { alreadyComplete: true, progress: await recomputeCourseProgress(enrollment.id) };

  await prisma.lessonProgress.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: params.lessonId } },
    update: { status: "COMPLETED", completedAt: new Date() },
    create: { enrollmentId: enrollment.id, lessonId: params.lessonId, status: "COMPLETED", startedAt: new Date(), completedAt: new Date() },
  });
  const progress = await recomputeCourseProgress(enrollment.id);
  await Promise.all([touchStreak(params.userId), recordLearningTime(params.userId, 0, 1)]);
  if (progress.lessonsCompleted === 1) await awardBadge(params.userId, "FIRST_LESSON");
  await evaluateAndCompleteIfReady(enrollment.id);
  return { alreadyComplete: false, progress };
}

export async function recomputeCourseProgress(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, select: { courseId: true } });
  const { flat } = await orderedLessons(enrollment.courseId);
  const ids = flat.map((l) => l.id);
  const completed = await prisma.lessonProgress.count({ where: { enrollmentId, status: "COMPLETED", lessonId: { in: ids } } });
  const percent = ids.length ? Math.round((completed / ids.length) * 10000) / 100 : 0;
  return prisma.courseProgress.upsert({
    where: { enrollmentId },
    update: { lessonsCompleted: completed, lessonsTotal: ids.length, percent, lastActivityAt: new Date() },
    create: { enrollmentId, lessonsCompleted: completed, lessonsTotal: ids.length, percent, lastActivityAt: new Date() },
  });
}

/** Next lesson to open for an enrollment: last visited if incomplete, else the first incomplete. */
export async function nextLessonFor(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollmentId }, select: { courseId: true, progress: { select: { lastLessonId: true } } } });
  const { flat } = await orderedLessons(enrollment.courseId);
  if (!flat.length) return null;
  const done = new Set((await prisma.lessonProgress.findMany({ where: { enrollmentId, status: "COMPLETED" }, select: { lessonId: true } })).map((p) => p.lessonId));
  const last = enrollment.progress?.lastLessonId;
  if (last && !done.has(last)) return flat.find((l) => l.id === last) ?? null;
  return flat.find((l) => !done.has(l.id)) ?? flat[flat.length - 1] ?? null;
}

export async function saveNote(params: { studentId: string; lessonId: string; body: string; timestampSeconds?: number | null; noteId?: string }) {
  if (params.noteId) {
    const note = await prisma.lessonNote.findUnique({ where: { id: params.noteId } });
    if (!note || note.studentId !== params.studentId) throw AppError.forbidden();
    return prisma.lessonNote.update({ where: { id: params.noteId }, data: { body: params.body, timestampSeconds: params.timestampSeconds ?? null } });
  }
  const courseId = await courseIdForLesson(params.lessonId);
  if (!courseId) throw AppError.notFound("Lesson");
  await requireEnrollment(params.studentId, courseId);
  return prisma.lessonNote.create({ data: { studentId: params.studentId, lessonId: params.lessonId, body: params.body, timestampSeconds: params.timestampSeconds ?? null } });
}

export async function deleteNote(studentId: string, noteId: string) {
  const note = await prisma.lessonNote.findUnique({ where: { id: noteId } });
  if (!note || note.studentId !== studentId) throw AppError.forbidden();
  await prisma.lessonNote.delete({ where: { id: noteId } });
}

export async function addBookmark(params: { studentId: string; lessonId: string; timestampSeconds: number; label?: string }) {
  const courseId = await courseIdForLesson(params.lessonId);
  if (!courseId) throw AppError.notFound("Lesson");
  await requireEnrollment(params.studentId, courseId);
  return prisma.lessonBookmark.create({ data: { studentId: params.studentId, lessonId: params.lessonId, timestampSeconds: params.timestampSeconds, label: params.label ?? null } });
}

export async function removeBookmark(studentId: string, bookmarkId: string) {
  const b = await prisma.lessonBookmark.findUnique({ where: { id: bookmarkId } });
  if (!b || b.studentId !== studentId) throw AppError.forbidden();
  await prisma.lessonBookmark.delete({ where: { id: bookmarkId } });
}
