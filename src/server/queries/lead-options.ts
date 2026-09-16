import "server-only";
import { prisma } from "@/server/db/prisma";

/** Option lists for the lead form: published courses, counsellors and active campaigns. */
export async function leadFormOptions() {
  const [courses, counsellors, campaigns] = await Promise.all([
    prisma.course.findMany({ where: { deletedAt: null, status: "PUBLISHED" }, select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.user.findMany({ where: { status: "ACTIVE", roles: { some: { role: { key: { in: ["COUNSELLOR", "ADMISSIONS_MANAGER", "ADMIN", "SUPER_ADMIN"] } } } } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { courses, counsellors, campaigns };
}
