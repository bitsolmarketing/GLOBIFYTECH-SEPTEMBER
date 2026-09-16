import "server-only";
import { prisma } from "@/server/db/prisma";

/** Option lists shared by the admin batch and enrollment forms. */
export async function batchFormOptions() {
  const [courses, campuses, classrooms, instructors] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, status: { not: "ARCHIVED" } }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.campus.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.classroom.findMany({ where: { isActive: true }, select: { id: true, name: true, campusId: true }, orderBy: { name: "asc" } }),
    prisma.instructorProfile.findMany({ where: { user: { status: "ACTIVE" } }, select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } } }),
  ]);
  return { courses, campuses, classrooms, instructors: instructors.map((i) => ({ id: i.id, name: i.user.name })) };
}
