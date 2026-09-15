import "server-only";
import { prisma, type Prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { matchJob } from "@/lib/job-matching";
import { slugify } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";
import type { JobStatus } from "@prisma/client";

export async function ensurePortfolio(studentId: string) {
  const existing = await prisma.portfolio.findUnique({ where: { studentId } });
  if (existing) return existing;
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId }, include: { user: { select: { name: true } } } });
  let username = slugify(student.user.name) || `student-${student.studentNumber.toLowerCase()}`;
  let i = 2;
  while (await prisma.portfolio.findUnique({ where: { username } })) username = `${slugify(student.user.name)}-${i++}`;
  return prisma.portfolio.create({ data: { studentId, username } });
}

export async function updatePortfolio(studentId: string, input: { username: string; headline?: string; about?: string; isPublic: boolean; showCertificates: boolean; showSkills: boolean }) {
  const portfolio = await ensurePortfolio(studentId);
  const taken = await prisma.portfolio.findFirst({ where: { username: input.username, NOT: { id: portfolio.id } } });
  if (taken) throw AppError.conflict("That username is already taken.");
  return prisma.portfolio.update({ where: { id: portfolio.id }, data: { username: input.username, headline: input.headline || null, about: input.about || null, isPublic: input.isPublic, showCertificates: input.showCertificates, showSkills: input.showSkills } });
}

export async function upsertPortfolioProject(studentId: string, input: { id?: string; title: string; description?: string; coverMediaId?: string | null; repoUrl?: string; liveUrl?: string; skills: string[]; isVisible: boolean }) {
  const portfolio = await ensurePortfolio(studentId);
  const data = { title: input.title, description: input.description || null, coverMediaId: input.coverMediaId ?? null, repoUrl: input.repoUrl || null, liveUrl: input.liveUrl || null, skills: input.skills, isVisible: input.isVisible };
  if (input.id) {
    const existing = await prisma.portfolioProject.findUnique({ where: { id: input.id } });
    if (!existing || existing.portfolioId !== portfolio.id) throw AppError.forbidden();
    return prisma.portfolioProject.update({ where: { id: input.id }, data });
  }
  const count = await prisma.portfolioProject.count({ where: { portfolioId: portfolio.id } });
  return prisma.portfolioProject.create({ data: { ...data, portfolioId: portfolio.id, order: count } });
}

export async function deletePortfolioProject(studentId: string, id: string) {
  const p = await prisma.portfolioProject.findUnique({ where: { id }, include: { portfolio: true } });
  if (!p || p.portfolio.studentId !== studentId) throw AppError.forbidden();
  await prisma.portfolioProject.delete({ where: { id } });
}

/** Public portfolio page payload (null when private or missing). */
export async function getPublicPortfolio(username: string) {
  const portfolio = await prisma.portfolio.findUnique({
    where: { username },
    include: {
      student: { include: { user: { select: { name: true, avatar: { select: { url: true } } } }, skills: { include: { skill: true }, orderBy: { level: "desc" } }, certificates: { where: { status: "VALID" }, include: { course: { select: { title: true } } }, orderBy: { issuedAt: "desc" } } } },
      projects: { where: { isVisible: true }, orderBy: { order: "asc" }, include: { cover: { select: { url: true, alt: true } } } },
    },
  });
  if (!portfolio || !portfolio.isPublic) return null;
  return portfolio;
}

export async function getOwnPortfolio(studentId: string) {
  const portfolio = await ensurePortfolio(studentId);
  return prisma.portfolio.findUniqueOrThrow({ where: { id: portfolio.id }, include: { projects: { orderBy: { order: "asc" }, include: { cover: { select: { url: true } } } } } });
}

// ───────────── Skills ─────────────

export async function setStudentSkills(studentId: string, skills: Array<{ skillId: string; level: number }>) {
  await prisma.$transaction(async (tx) => {
    await tx.studentSkill.deleteMany({ where: { studentId, source: "SELF" } });
    for (const s of skills) {
      await tx.studentSkill.upsert({ where: { studentId_skillId: { studentId, skillId: s.skillId } }, update: { level: s.level }, create: { studentId, skillId: s.skillId, level: s.level, source: "SELF" } });
    }
  });
}

/** Called on certificate issue: course skills become verified student skills. */
export async function verifySkillsFromCourse(studentId: string, courseId: string) {
  const skills = await prisma.courseSkill.findMany({ where: { courseId }, select: { skillId: true } });
  for (const s of skills) {
    await prisma.studentSkill.upsert({ where: { studentId_skillId: { studentId, skillId: s.skillId } }, update: { verified: true, source: "COURSE", level: { increment: 0 } }, create: { studentId, skillId: s.skillId, level: 3, verified: true, source: "COURSE" } });
  }
}

// ───────────── Jobs & internships ─────────────

async function uniqueJobSlug(title: string, table: "job" | "internship" | "employer") {
  const root = slugify(title) || table;
  let candidate = root;
  let i = 2;
  const exists = async (slug: string) => (table === "job" ? prisma.job.findUnique({ where: { slug } }) : table === "internship" ? prisma.internship.findUnique({ where: { slug } }) : prisma.employer.findUnique({ where: { slug } }));
  while (await exists(candidate)) candidate = `${root}-${i++}`;
  return candidate;
}

export async function upsertEmployer(input: { id?: string; name: string; slug?: string; website?: string; industry?: string; city?: string; country: string; logoMediaId?: string | null; description?: string; isVerified: boolean; isHiringPartner: boolean }) {
  const data = { name: input.name, website: input.website || null, industry: input.industry || null, city: input.city || null, country: input.country, logoMediaId: input.logoMediaId ?? null, description: input.description || null, isVerified: input.isVerified, isHiringPartner: input.isHiringPartner };
  if (input.id) return prisma.employer.update({ where: { id: input.id }, data });
  return prisma.employer.create({ data: { ...data, slug: await uniqueJobSlug(input.slug ?? input.name, "employer") } });
}

export async function upsertJob(input: { id?: string; employerId: string; title: string; slug?: string; description?: string; type: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "FREELANCE" | "REMOTE"; location?: string; isRemote: boolean; salaryMin?: number | null; salaryMax?: number | null; currency: string; status: JobStatus; closesAt?: Date | null; skills: Array<{ skillId: string; required: boolean }> }) {
  const data = { employerId: input.employerId, title: input.title, description: input.description ? sanitizeRichText(input.description) : null, type: input.type, location: input.location || null, isRemote: input.isRemote, salaryMin: input.salaryMin ?? null, salaryMax: input.salaryMax ?? null, currency: input.currency, status: input.status, closesAt: input.closesAt ?? null, postedAt: input.status === "OPEN" ? new Date() : undefined };
  return prisma.$transaction(async (tx) => {
    const job = input.id ? await tx.job.update({ where: { id: input.id }, data }) : await tx.job.create({ data: { ...data, slug: await uniqueJobSlug(input.slug ?? input.title, "job"), postedAt: input.status === "OPEN" ? new Date() : null } });
    await tx.jobSkill.deleteMany({ where: { jobId: job.id } });
    if (input.skills.length) await tx.jobSkill.createMany({ data: input.skills.map((s) => ({ jobId: job.id, skillId: s.skillId, required: s.required })) });
    return job;
  });
}

export async function upsertInternship(input: { id?: string; employerId: string; title: string; slug?: string; description?: string; durationWeeks?: number | null; stipend?: number | null; currency: string; location?: string; isRemote: boolean; status: JobStatus; closesAt?: Date | null; skills: Array<{ skillId: string; required: boolean }> }) {
  const data = { employerId: input.employerId, title: input.title, description: input.description ? sanitizeRichText(input.description) : null, durationWeeks: input.durationWeeks ?? null, stipend: input.stipend ?? null, currency: input.currency, location: input.location || null, isRemote: input.isRemote, status: input.status, closesAt: input.closesAt ?? null };
  return prisma.$transaction(async (tx) => {
    const row = input.id ? await tx.internship.update({ where: { id: input.id }, data }) : await tx.internship.create({ data: { ...data, slug: await uniqueJobSlug(input.slug ?? input.title, "internship"), postedAt: input.status === "OPEN" ? new Date() : null } });
    await tx.jobSkill.deleteMany({ where: { internshipId: row.id } });
    if (input.skills.length) await tx.jobSkill.createMany({ data: input.skills.map((s) => ({ internshipId: row.id, skillId: s.skillId, required: s.required })) });
    return row;
  });
}

/** Open opportunities with a match score for the student. */
export async function opportunitiesForStudent(studentId: string) {
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId }, include: { skills: true, certificates: { where: { status: "VALID" }, select: { course: { select: { skills: { select: { skillId: true } } } } } } } });
  const matchInput = { skills: student.skills.map((s) => ({ skillId: s.skillId, level: s.level, verified: s.verified })), certificateCourseSkillIds: student.certificates.flatMap((c) => c.course.skills.map((s) => s.skillId)), city: student.city };
  const [jobs, internships, applications] = await Promise.all([
    prisma.job.findMany({ where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gte: new Date() } }] }, include: { employer: { select: { id: true, name: true, slug: true, logo: { select: { url: true } }, isHiringPartner: true } }, skills: { include: { skill: true } } }, orderBy: { postedAt: "desc" } }),
    prisma.internship.findMany({ where: { status: "OPEN", OR: [{ closesAt: null }, { closesAt: { gte: new Date() } }] }, include: { employer: { select: { id: true, name: true, slug: true, logo: { select: { url: true } }, isHiringPartner: true } }, skills: { include: { skill: true } } }, orderBy: { postedAt: "desc" } }),
    prisma.jobApplication.findMany({ where: { studentId }, select: { jobId: true, internshipId: true, status: true } }),
  ]);
  const applied = new Map<string, string>();
  for (const a of applications) applied.set(a.jobId ?? a.internshipId ?? "", a.status);
  const score = (skills: Array<{ skillId: string; required: boolean }>, location: string | null, isRemote: boolean) => matchJob(matchInput, { skills, location, isRemote });
  return {
    jobs: jobs.map((j) => ({ ...j, kind: "job" as const, match: score(j.skills, j.location, j.isRemote), appliedStatus: applied.get(j.id) ?? null })).sort((a, b) => b.match.percent - a.match.percent),
    internships: internships.map((i) => ({ ...i, kind: "internship" as const, match: score(i.skills, i.location, i.isRemote), appliedStatus: applied.get(i.id) ?? null })).sort((a, b) => b.match.percent - a.match.percent),
  };
}

export async function applyToOpportunity(studentId: string, input: { jobId?: string | null; internshipId?: string | null; coverLetter?: string; cvMediaId?: string | null }) {
  const existing = await prisma.jobApplication.findFirst({ where: { studentId, ...(input.jobId ? { jobId: input.jobId } : { internshipId: input.internshipId! }) } });
  if (existing) throw AppError.conflict("You've already applied to this opportunity.");
  const opp = input.jobId ? await prisma.job.findUnique({ where: { id: input.jobId }, include: { skills: true } }) : await prisma.internship.findUnique({ where: { id: input.internshipId! }, include: { skills: true } });
  if (!opp || opp.status !== "OPEN") throw AppError.notFound("Opportunity");
  const student = await prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId }, include: { skills: true } });
  const match = matchJob({ skills: student.skills.map((s) => ({ skillId: s.skillId, level: s.level, verified: s.verified })), certificateCourseSkillIds: [], city: student.city }, { skills: opp.skills, location: opp.location, isRemote: opp.isRemote });
  return prisma.jobApplication.create({ data: { studentId, jobId: input.jobId ?? null, internshipId: input.internshipId ?? null, coverLetter: input.coverLetter || null, cvMediaId: input.cvMediaId ?? null, matchScore: match.percent } });
}

export async function listJobApplications(filters: { jobId?: string; internshipId?: string; status?: string; page?: number; pageSize?: number }) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const where: Prisma.JobApplicationWhereInput = { ...(filters.jobId ? { jobId: filters.jobId } : {}), ...(filters.internshipId ? { internshipId: filters.internshipId } : {}), ...(filters.status ? { status: filters.status as never } : {}) };
  const [items, total] = await Promise.all([
    prisma.jobApplication.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { student: { select: { id: true, studentNumber: true, headline: true, user: { select: { name: true, email: true, avatar: { select: { url: true } } } } } }, job: { select: { id: true, title: true, employer: { select: { name: true } } } }, internship: { select: { id: true, title: true, employer: { select: { name: true } } } } } }),
    prisma.jobApplication.count({ where }),
  ]);
  return { items, total, page, pageSize };
}
