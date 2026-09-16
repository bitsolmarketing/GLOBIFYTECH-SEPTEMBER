import type { Metadata } from "next";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { StudentCalendar } from "./student-calendar";
import { daysAgo, daysAhead } from "@/lib/utils";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { studentId } = await requireStudentProfile();
  const from = daysAgo(60);
  const to = daysAhead(120);
  const [memberships, enrollments] = await Promise.all([prisma.batchStudent.findMany({ where: { studentId, leftAt: null }, select: { batchId: true } }), prisma.enrollment.findMany({ where: { studentId, status: "ACTIVE" }, select: { courseId: true } })]);
  const batchIds = memberships.map((m) => m.batchId);
  const courseIds = enrollments.map((e) => e.courseId);
  const [classes, assignments, exams, projects, events] = await Promise.all([
    prisma.liveClass.findMany({ where: { startsAt: { gte: from, lte: to }, status: { not: "CANCELLED" }, OR: [{ batchId: { in: batchIds } }, { batchId: null, courseId: { in: courseIds } }] }, select: { id: true, title: true, startsAt: true } }),
    prisma.assignment.findMany({ where: { isPublished: true, courseId: { in: courseIds }, dueAt: { gte: from, lte: to } }, select: { id: true, title: true, dueAt: true } }),
    prisma.exam.findMany({ where: { isPublished: true, courseId: { in: courseIds }, scheduledAt: { gte: from, lte: to }, OR: [{ batchId: null }, { batchId: { in: batchIds } }] }, select: { id: true, title: true, scheduledAt: true } }),
    prisma.project.findMany({ where: { isPublished: true, courseId: { in: courseIds }, deadline: { gte: from, lte: to } }, select: { id: true, title: true, deadline: true } }),
    prisma.event.findMany({ where: { status: "PUBLISHED", startsAt: { gte: from, lte: to } }, select: { id: true, title: true, startsAt: true, slug: true } }),
  ]);
  const items = [
    ...classes.map((c) => ({ id: `lc-${c.id}`, date: c.startsAt.toISOString(), title: c.title, kind: "Live class", tone: "accent" as const, href: "/student/live-classes" })),
    ...assignments.map((a) => ({ id: `as-${a.id}`, date: a.dueAt!.toISOString(), title: `Due: ${a.title}`, kind: "Assignment", tone: "warning" as const, href: `/student/assignments/${a.id}` })),
    ...exams.map((e) => ({ id: `ex-${e.id}`, date: e.scheduledAt!.toISOString(), title: e.title, kind: "Exam", tone: "danger" as const, href: "/student/exams" })),
    ...projects.map((p) => ({ id: `pr-${p.id}`, date: p.deadline!.toISOString(), title: `Deadline: ${p.title}`, kind: "Project", tone: "purple" as const, href: `/student/projects/${p.id}` })),
    ...events.map((e) => ({ id: `ev-${e.id}`, date: e.startsAt.toISOString(), title: e.title, kind: "Event", tone: "success" as const, href: `/events/${e.slug}` })),
  ];
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendar" description="Live classes, deadlines, exams and events in one place." />
      <StudentCalendar items={items} />
    </div>
  );
}
