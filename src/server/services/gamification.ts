import "server-only";
import { prisma } from "@/server/db/prisma";
import { notify } from "./notifications";

export const BADGES = [
  { key: "FIRST_LESSON", name: "First Lesson", description: "Completed your first lesson.", icon: "play" },
  { key: "STREAK_7", name: "7-Day Streak", description: "Learned seven days in a row.", icon: "flame" },
  { key: "STREAK_30", name: "30-Day Streak", description: "Learned thirty days in a row.", icon: "flame" },
  { key: "QUIZ_MASTER", name: "Quiz Master", description: "Scored 90% or higher on five quizzes.", icon: "list-checks" },
  { key: "ASSIGNMENT_MASTER", name: "Assignment Master", description: "Five assignments approved on the first attempt.", icon: "clipboard-check" },
  { key: "PROJECT_COMPLETED", name: "Project Completed", description: "Your first project was approved.", icon: "folder-kanban" },
  { key: "COURSE_COMPLETED", name: "Course Completed", description: "Completed a full course.", icon: "graduation-cap" },
  { key: "PERFECT_ATTENDANCE", name: "Perfect Attendance", description: "100% attendance in a batch.", icon: "user-check" },
  { key: "TOP_PERFORMER", name: "Top Performer", description: "Finished in the top 3 of a course leaderboard.", icon: "trophy" },
] as const;

export type BadgeKey = (typeof BADGES)[number]["key"];

/** Idempotent badge award; notifies the user the first time. */
export async function awardBadge(userId: string, key: BadgeKey, context?: Record<string, unknown>) {
  const enabled = await prisma.setting.findUnique({ where: { key: "gamification.enabled" } });
  if (enabled && enabled.value === false) return null;
  const badge = await prisma.badge.findUnique({ where: { key } });
  if (!badge) return null;
  const existing = await prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId: badge.id } } });
  if (existing) return existing;
  const awarded = await prisma.userBadge.create({ data: { userId, badgeId: badge.id, context: context as never } });
  await notify({ userId, event: "SYSTEM", data: { badge: badge.name }, href: "/student/dashboard", fallback: { title: `Badge earned: ${badge.name}`, body: badge.description ?? "" }, channels: ["IN_APP"] });
  return awarded;
}

/** Course leaderboard: quiz average + progress + attendance, when enabled on the course. */
export async function courseLeaderboard(courseId: string, limit = 10) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { leaderboardEnabled: true } });
  if (!course?.leaderboardEnabled) return null;
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: { in: ["ACTIVE", "COMPLETED"] } },
    select: {
      studentId: true,
      student: { select: { user: { select: { name: true, avatar: { select: { url: true } } } } } },
      progress: { select: { percent: true } },
      quizAttempts: { where: { status: "GRADED" }, select: { percent: true } },
    },
  });
  const rows = enrollments.map((e) => {
    const quizAvg = e.quizAttempts.length ? e.quizAttempts.reduce((s, a) => s + Number(a.percent), 0) / e.quizAttempts.length : 0;
    const progress = Number(e.progress?.percent ?? 0);
    return { studentId: e.studentId, name: e.student.user.name, avatar: e.student.user.avatar?.url ?? null, points: Math.round(progress * 0.6 + quizAvg * 0.4) };
  });
  return rows.sort((a, b) => b.points - a.points).slice(0, limit).map((r, i) => ({ ...r, rank: i + 1 }));
}
