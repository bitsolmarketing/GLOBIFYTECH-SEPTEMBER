import { z } from "zod";
import { nonEmpty, richText, slug, uuid, url } from "./common";
import { contentStatus } from "./course";

export const pageSectionType = z.enum([
  "HERO", "TEXT", "IMAGE", "VIDEO", "COURSE_GRID", "PROGRAM_GRID", "INSTRUCTOR_GRID", "STATS", "TESTIMONIALS", "FAQ", "CTA", "BLOG", "GALLERY", "TIMELINE", "LOGO_CLOUD", "FEATURES", "LEARNING_PATHS", "EVENTS", "SUCCESS_STORIES",
]);

const seoFields = {
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  seoDescription: z.string().trim().max(160).optional().or(z.literal("")),
  canonicalUrl: url.optional().or(z.literal("")),
  ogImageMediaId: uuid.optional().nullable(),
  noindex: z.coerce.boolean().default(false),
};

export const pageSchema = z.object({
  title: nonEmpty.max(140),
  slug: slug.or(z.literal("home")).optional(),
  locale: z.string().max(5).default("en"),
  ...seoFields,
  schemaJson: z.unknown().optional(),
});
export type PageInput = z.infer<typeof pageSchema>;

/** Per-section data shapes (validated when saving a section). */
export const sectionDataSchemas = {
  HERO: z.object({
    eyebrow: z.string().max(80).optional(),
    headline: nonEmpty.max(160),
    headline2: z.string().max(160).optional(),
    subheadline: z.string().max(400).optional(),
    primaryCta: z.object({ label: nonEmpty.max(40), href: nonEmpty.max(200) }).optional(),
    secondaryCta: z.object({ label: nonEmpty.max(40), href: nonEmpty.max(200) }).optional(),
    mediaId: uuid.optional().nullable(),
    variant: z.enum(["cinematic", "minimal", "split"]).default("cinematic"),
    show3d: z.boolean().default(true),
  }),
  TEXT: z.object({ eyebrow: z.string().max(80).optional(), title: z.string().max(160).optional(), body: richText, align: z.enum(["start", "center"]).default("start"), narrow: z.boolean().default(true) }),
  IMAGE: z.object({ mediaId: uuid, caption: z.string().max(200).optional(), full: z.boolean().default(false) }),
  VIDEO: z.object({ url: url.optional(), mediaId: uuid.optional().nullable(), title: z.string().max(160).optional(), caption: z.string().max(200).optional() }),
  COURSE_GRID: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), mode: z.enum(["featured", "category", "manual", "latest"]).default("featured"), categoryId: uuid.optional().nullable(), courseIds: z.array(uuid).max(12).default([]), limit: z.number().int().min(1).max(12).default(6), ctaLabel: z.string().max(40).optional() }),
  PROGRAM_GRID: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(12).default(4) }),
  INSTRUCTOR_GRID: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(12).default(4), featuredOnly: z.boolean().default(true) }),
  STATS: z.object({ title: z.string().max(160).optional(), items: z.array(z.object({ value: nonEmpty.max(20), label: nonEmpty.max(60), hint: z.string().max(80).optional() })).min(1).max(6) }),
  TESTIMONIALS: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(12).default(6), featuredOnly: z.boolean().default(true) }),
  FAQ: z.object({ title: z.string().max(160).optional(), group: z.string().max(40).default("general"), limit: z.number().int().min(1).max(20).default(8) }),
  CTA: z.object({ title: nonEmpty.max(160), subtitle: z.string().max(300).optional(), primaryCta: z.object({ label: nonEmpty.max(40), href: nonEmpty.max(200) }), secondaryCta: z.object({ label: nonEmpty.max(40), href: nonEmpty.max(200) }).optional(), variant: z.enum(["gradient", "dark", "light"]).default("gradient") }),
  BLOG: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(9).default(3), categoryId: uuid.optional().nullable() }),
  GALLERY: z.object({ title: z.string().max(160).optional(), mediaIds: z.array(uuid).min(1).max(24), columns: z.number().int().min(2).max(4).default(3) }),
  TIMELINE: z.object({ title: z.string().max(160).optional(), items: z.array(z.object({ title: nonEmpty.max(100), description: z.string().max(300).optional(), meta: z.string().max(40).optional() })).min(2).max(12) }),
  LOGO_CLOUD: z.object({ title: z.string().max(160).optional(), logos: z.array(z.object({ name: nonEmpty.max(60), mediaId: uuid.optional().nullable(), href: url.optional() })).min(1).max(24) }),
  FEATURES: z.object({ eyebrow: z.string().max(80).optional(), title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), items: z.array(z.object({ icon: z.string().max(40).optional(), title: nonEmpty.max(80), description: nonEmpty.max(300) })).min(2).max(9), layout: z.enum(["grid", "list", "bento"]).default("grid") }),
  LEARNING_PATHS: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(6).default(3) }),
  EVENTS: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(6).default(3) }),
  SUCCESS_STORIES: z.object({ title: z.string().max(160).optional(), subtitle: z.string().max(300).optional(), limit: z.number().int().min(1).max(6).default(3) }),
} as const;

export const pageSectionSchema = z.object({
  pageId: uuid,
  type: pageSectionType,
  name: z.string().max(80).optional().or(z.literal("")),
  data: z.unknown(),
  isVisible: z.boolean().default(true),
  order: z.coerce.number().int().min(0).optional(),
});

export const publishSchema = z.object({ id: uuid, action: z.enum(["publish", "unpublish", "schedule", "archive"]), scheduledAt: z.coerce.date().optional().nullable() });

export const navigationItemSchema = z.object({
  navigationId: uuid,
  parentId: uuid.optional().nullable(),
  label: nonEmpty.max(60),
  href: nonEmpty.max(300),
  description: z.string().max(120).optional().or(z.literal("")),
  openInNewTab: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  order: z.coerce.number().int().min(0).optional(),
});

export const blogPostSchema = z.object({
  title: nonEmpty.max(160),
  slug: slug.optional(),
  excerpt: z.string().trim().max(400).optional().or(z.literal("")),
  content: richText.optional(),
  categoryId: uuid.optional().nullable(),
  tagNames: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  featuredMediaId: uuid.optional().nullable(),
  status: contentStatus.default("DRAFT"),
  scheduledAt: z.coerce.date().optional().nullable(),
  ...seoFields,
});
export type BlogPostInput = z.infer<typeof blogPostSchema>;

export const eventSchema = z.object({
  title: nonEmpty.max(160),
  slug: slug.optional(),
  description: richText.optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().optional().nullable(),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  isOnline: z.coerce.boolean().default(false),
  meetingUrl: url.optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).optional().nullable(),
  coverMediaId: uuid.optional().nullable(),
  campusId: uuid.optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"]).default("DRAFT"),
});

export const eventRegistrationSchema = z.object({ eventId: uuid, name: nonEmpty.max(80), email: z.string().email(), phone: z.string().max(20).optional().or(z.literal("")) });

export const testimonialSchema = z.object({
  name: nonEmpty.max(80),
  role: z.string().trim().max(80).optional().or(z.literal("")),
  company: z.string().trim().max(80).optional().or(z.literal("")),
  quote: nonEmpty.max(1000),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  avatarMediaId: uuid.optional().nullable(),
  courseTitle: z.string().trim().max(120).optional().or(z.literal("")),
  outcome: z.string().trim().max(80).optional().or(z.literal("")),
  isFeatured: z.coerce.boolean().default(false),
  isApproved: z.coerce.boolean().default(true),
  order: z.coerce.number().int().min(0).default(0),
});

export const faqSchema = z.object({ question: nonEmpty.max(200), answer: nonEmpty.max(3000), group: z.string().max(40).default("general"), order: z.coerce.number().int().min(0).default(0), isVisible: z.coerce.boolean().default(true) });

export const successStorySchema = z.object({
  name: nonEmpty.max(80),
  slug: slug.optional(),
  headline: nonEmpty.max(160),
  story: richText,
  outcome: z.string().trim().max(120).optional().or(z.literal("")),
  courseTitle: z.string().trim().max(120).optional().or(z.literal("")),
  coverMediaId: uuid.optional().nullable(),
  status: contentStatus.default("DRAFT"),
  isFeatured: z.coerce.boolean().default(false),
});

export const contactSchema = z.object({
  name: nonEmpty.max(80),
  email: z.string().email(),
  phone: z.string().max(20).optional().or(z.literal("")),
  subject: nonEmpty.max(120),
  message: nonEmpty.max(3000),
  website: z.string().max(0).optional(),
});
