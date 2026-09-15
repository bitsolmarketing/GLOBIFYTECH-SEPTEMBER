import { z } from "zod";
import { money, nonEmpty, richText, slug, uuid } from "./common";

export const courseLevel = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]);
export const learningMode = z.enum(["ON_CAMPUS", "LIVE_ONLINE", "HYBRID", "SELF_PACED"]);
export const contentStatus = z.enum(["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
export const lessonType = z.enum(["VIDEO", "TEXT", "LIVE", "QUIZ", "ASSIGNMENT", "PROJECT", "RESOURCE"]);

const stringList = z.array(z.string().trim().min(1).max(200)).max(30).default([]);

export const courseSchema = z.object({
  title: nonEmpty.max(140),
  slug: slug.optional(),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  shortDescription: z.string().trim().max(400).optional().or(z.literal("")),
  description: richText.optional(),
  categoryId: uuid.optional().nullable(),
  level: courseLevel.default("BEGINNER"),
  mode: learningMode.default("HYBRID"),
  durationWeeks: z.coerce.number().int().min(1).max(104).optional().nullable(),
  hoursPerWeek: z.coerce.number().int().min(1).max(60).optional().nullable(),
  language: z.string().max(10).default("en"),
  price: money.default(0),
  discountPrice: money.optional().nullable(),
  currency: z.string().length(3).default("PKR"),
  artworkMediaId: uuid.optional().nullable(),
  promoVideoMediaId: uuid.optional().nullable(),
  featured: z.coerce.boolean().default(false),
  outcomes: stringList,
  prerequisites: stringList,
  careerOutcomes: stringList,
  faqs: z.array(z.object({ question: nonEmpty.max(200), answer: nonEmpty.max(2000) })).max(20).default([]),
  skillIds: z.array(uuid).max(30).default([]),
  instructorIds: z.array(uuid).max(10).default([]),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
  noindex: z.coerce.boolean().default(false),
  leaderboardEnabled: z.coerce.boolean().default(false),
  campusId: uuid.optional().nullable(),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  courseId: uuid,
  title: nonEmpty.max(140),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  order: z.coerce.number().int().min(0).optional(),
});

export const unitSchema = z.object({
  moduleId: uuid,
  title: nonEmpty.max(140),
  order: z.coerce.number().int().min(0).optional(),
});

export const lessonSchema = z.object({
  unitId: uuid,
  title: nonEmpty.max(160),
  type: lessonType.default("VIDEO"),
  content: richText.optional(),
  videoMediaId: uuid.optional().nullable(),
  videoUrl: z.string().trim().url().optional().or(z.literal("")),
  durationSeconds: z.coerce.number().int().min(0).max(86400).default(0),
  isPreview: z.coerce.boolean().default(false),
  isPublished: z.coerce.boolean().default(true),
  objectives: stringList,
  quizId: uuid.optional().nullable(),
  assignmentId: uuid.optional().nullable(),
  projectId: uuid.optional().nullable(),
  resources: z
    .array(z.object({ title: nonEmpty.max(120), type: z.enum(["FILE", "LINK", "VIDEO", "CODE"]).default("FILE"), mediaId: uuid.optional().nullable(), url: z.string().url().optional().or(z.literal("")) }))
    .max(20)
    .default([]),
});
export type LessonInput = z.infer<typeof lessonSchema>;

export const reorderSchema = z.object({ ids: z.array(uuid).min(1).max(500) });

export const completionRuleSchema = z.object({
  courseId: uuid,
  requireAllLessons: z.coerce.boolean().default(true),
  minAttendancePercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  minQuizPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  minExamPercent: z.coerce.number().int().min(0).max(100).optional().nullable(),
  requireProjects: z.coerce.boolean().default(false),
  requirePaymentClear: z.coerce.boolean().default(false),
  autoIssueCertificate: z.coerce.boolean().default(true),
  certificateValidityMonths: z.coerce.number().int().min(1).max(120).optional().nullable(),
});

export const programSchema = z.object({
  title: nonEmpty.max(140),
  slug: slug.optional(),
  subtitle: z.string().trim().max(200).optional().or(z.literal("")),
  description: richText.optional(),
  durationWeeks: z.coerce.number().int().min(1).max(200).optional().nullable(),
  price: money.optional().nullable(),
  featured: z.coerce.boolean().default(false),
  outcomes: stringList,
  courseIds: z.array(uuid).max(20).default([]),
  artworkMediaId: uuid.optional().nullable(),
});

export const learningPathSchema = z.object({
  title: nonEmpty.max(140),
  slug: slug.optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  careerGoal: z.string().trim().max(120).optional().or(z.literal("")),
  artworkKey: z.string().max(30).default("ai"),
  featured: z.coerce.boolean().default(false),
  steps: z.array(z.object({ title: nonEmpty.max(120), description: z.string().max(500).optional(), courseId: uuid.optional().nullable(), isOptional: z.boolean().default(false) })).max(20).default([]),
});

export const categorySchema = z.object({
  name: nonEmpty.max(80),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  artworkKey: z.string().max(30).default("ai"),
  order: z.coerce.number().int().min(0).default(0),
  parentId: uuid.optional().nullable(),
});

export const reviewSchema = z.object({
  courseId: uuid,
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  body: z.string().trim().max(2000).optional().or(z.literal("")),
});
