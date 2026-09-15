import { z } from "zod";
import { money, nonEmpty, richText, slug, uuid, url } from "./common";

export const jobType = z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "FREELANCE", "REMOTE"]);
export const jobStatus = z.enum(["DRAFT", "OPEN", "CLOSED"]);

export const employerSchema = z.object({
  name: nonEmpty.max(120),
  slug: slug.optional(),
  website: url.optional().or(z.literal("")),
  industry: z.string().trim().max(80).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  country: z.string().length(2).default("PK"),
  logoMediaId: uuid.optional().nullable(),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  isVerified: z.coerce.boolean().default(false),
  isHiringPartner: z.coerce.boolean().default(false),
});

export const jobSchema = z.object({
  employerId: uuid,
  title: nonEmpty.max(140),
  slug: slug.optional(),
  description: richText.optional(),
  type: jobType.default("FULL_TIME"),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  isRemote: z.coerce.boolean().default(false),
  salaryMin: money.optional().nullable(),
  salaryMax: money.optional().nullable(),
  currency: z.string().length(3).default("PKR"),
  status: jobStatus.default("DRAFT"),
  closesAt: z.coerce.date().optional().nullable(),
  skills: z.array(z.object({ skillId: uuid, required: z.boolean().default(true) })).max(20).default([]),
});

export const internshipSchema = z.object({
  employerId: uuid,
  title: nonEmpty.max(140),
  slug: slug.optional(),
  description: richText.optional(),
  durationWeeks: z.coerce.number().int().min(1).max(52).optional().nullable(),
  stipend: money.optional().nullable(),
  currency: z.string().length(3).default("PKR"),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  isRemote: z.coerce.boolean().default(false),
  status: jobStatus.default("DRAFT"),
  closesAt: z.coerce.date().optional().nullable(),
  skills: z.array(z.object({ skillId: uuid, required: z.boolean().default(true) })).max(20).default([]),
});

export const jobApplySchema = z.object({
  jobId: uuid.optional().nullable(),
  internshipId: uuid.optional().nullable(),
  coverLetter: z.string().trim().max(5000).optional().or(z.literal("")),
  cvMediaId: uuid.optional().nullable(),
}).refine((d) => d.jobId || d.internshipId, { message: "Choose a job or internship" });

export const jobApplicationStatusSchema = z.object({ applicationId: uuid, status: z.enum(["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED", "WITHDRAWN"]) });

export const studentSkillsSchema = z.object({ skills: z.array(z.object({ skillId: uuid, level: z.coerce.number().int().min(1).max(5).default(3) })).max(50) });

export const portfolioSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens"),
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  about: z.string().trim().max(3000).optional().or(z.literal("")),
  isPublic: z.coerce.boolean().default(false),
  showCertificates: z.coerce.boolean().default(true),
  showSkills: z.coerce.boolean().default(true),
});

export const portfolioProjectSchema = z.object({
  id: uuid.optional(),
  title: nonEmpty.max(140),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  coverMediaId: uuid.optional().nullable(),
  repoUrl: url.optional().or(z.literal("")),
  liveUrl: url.optional().or(z.literal("")),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  isVisible: z.coerce.boolean().default(true),
});

export const careerProfileSchema = z.object({
  headline: z.string().trim().max(120).optional().or(z.literal("")),
  bio: z.string().trim().max(3000).optional().or(z.literal("")),
  githubUrl: url.optional().or(z.literal("")),
  linkedinUrl: url.optional().or(z.literal("")),
  websiteUrl: url.optional().or(z.literal("")),
  cvMediaId: uuid.optional().nullable(),
  freelanceProfiles: z.array(z.object({ platform: nonEmpty.max(40), url: url })).max(6).default([]),
});
