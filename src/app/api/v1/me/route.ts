import { handle, jsonOk } from "@/lib/api/respond";
import { requireApiUser } from "@/server/api/principal";
import { permissionsForRoles } from "@/lib/rbac";
import { prisma } from "@/server/db/prisma";

export const GET = handle(async (req) => {
  const user = await requireApiUser(req);
  const [student, instructor] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true, studentNumber: true, city: true, headline: true } }),
    prisma.instructorProfile.findUnique({ where: { userId: user.id }, select: { id: true, slug: true, title: true } }),
  ]);
  return jsonOk({
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    locale: user.locale,
    roles: user.roles,
    permissions: [...permissionsForRoles(user.roles)],
    student,
    instructor,
  });
});
