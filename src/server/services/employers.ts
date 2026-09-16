import "server-only";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import type { SessionUser } from "@/server/auth/session";

/**
 * Employer portal data, always scoped to the employer the signed-in user
 * belongs to. Hiring partners see their own postings and the graduates who
 * applied to them, and nothing else.
 */
export async function requireEmployerProfile(user: SessionUser) {
  const profile = await prisma.employerProfile.findUnique({
    where: { userId: user.id },
    include: { employer: { select: { id: true, name: true, slug: true, city: true, country: true, isVerified: true, isHiringPartner: true } } },
  });
  if (!profile) throw AppError.forbidden("Your account is not linked to a hiring partner yet.");
  return profile;
}

export async function getEmployerDashboard(employerId: string) {
  const [jobs, internships, applications] = await Promise.all([
    prisma.job.findMany({
      where: { employerId },
      orderBy: { createdAt: "desc" },
      include: { skills: { include: { skill: { select: { name: true } } } }, _count: { select: { applications: true } } },
    }),
    prisma.internship.findMany({
      where: { employerId },
      orderBy: { createdAt: "desc" },
      include: { skills: { include: { skill: { select: { name: true } } } }, _count: { select: { applications: true } } },
    }),
    prisma.jobApplication.findMany({
      where: { OR: [{ job: { employerId } }, { internship: { employerId } }] },
      orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        student: {
          select: {
            id: true,
            headline: true,
            user: { select: { name: true, email: true, avatar: { select: { url: true } } } },
            portfolio: { select: { username: true, isPublic: true } },
            skills: { include: { skill: { select: { name: true } } } },
            certificates: { where: { status: "VALID" }, select: { certificateNumber: true, course: { select: { title: true } } } },
          },
        },
        job: { select: { id: true, title: true } },
        internship: { select: { id: true, title: true } },
      },
    }),
  ]);
  return { jobs, internships, applications };
}

/** An employer may only move an application that belongs to one of their roles. */
export async function setEmployerApplicationStatus(params: { employerId: string; applicationId: string; status: "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "OFFERED" | "HIRED" | "REJECTED" }) {
  const application = await prisma.jobApplication.findFirst({
    where: { id: params.applicationId, OR: [{ job: { employerId: params.employerId } }, { internship: { employerId: params.employerId } }] },
    select: { id: true, student: { select: { userId: true } }, job: { select: { title: true } }, internship: { select: { title: true } } },
  });
  if (!application) throw AppError.forbidden("That application does not belong to your organisation.");
  const updated = await prisma.jobApplication.update({ where: { id: application.id }, data: { status: params.status } });

  const role = application.job?.title ?? application.internship?.title ?? "a role";
  const { notify } = await import("./notifications");
  await notify({
    userId: application.student.userId,
    event: "SYSTEM",
    data: { role, status: params.status },
    href: "/student/career",
    fallback: { title: `Update on your application for ${role}`, body: `The employer moved your application to ${params.status.toLowerCase()}.` },
    channels: ["IN_APP", "EMAIL"],
  });
  return updated;
}
