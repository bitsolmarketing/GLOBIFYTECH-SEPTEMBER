import { z } from "zod";
import { email, nonEmpty, phone, uuid } from "./common";
import { learningMode } from "./course";

export const leadSource = z.enum(["WEBSITE", "FACEBOOK", "INSTAGRAM", "GOOGLE", "WHATSAPP", "REFERRAL", "WALK_IN", "PHONE", "EVENT", "ORGANIC"]);
export const leadStage = z.enum(["NEW", "CONTACTED", "COUNSELLING", "INTERESTED", "APPLICATION", "APPROVED", "FEE_PENDING", "ENROLLED", "LOST"]);
export const leadActivityType = z.enum(["CALL", "WHATSAPP", "EMAIL", "MEETING", "NOTE", "STAGE_CHANGE", "TASK", "SYSTEM"]);

/** Public lead capture (website / contact / course enquiry). */
export const publicLeadSchema = z.object({
  name: nonEmpty.max(80),
  phone,
  email: email.optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  courseId: uuid.optional().nullable(),
  interest: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  preferredMode: learningMode.optional(),
  source: leadSource.default("WEBSITE"),
  utm: z.object({ source: z.string().max(80).optional(), medium: z.string().max(80).optional(), campaign: z.string().max(120).optional() }).optional(),
  /** Honeypot — must stay empty */
  website: z.string().max(0).optional(),
});
export type PublicLeadInput = z.infer<typeof publicLeadSchema>;

export const leadSchema = z.object({
  name: nonEmpty.max(80),
  phone: phone.optional().or(z.literal("")),
  whatsapp: phone.optional().or(z.literal("")),
  email: email.optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  education: z.string().trim().max(120).optional().or(z.literal("")),
  courseId: uuid.optional().nullable(),
  interest: z.string().trim().max(120).optional().or(z.literal("")),
  source: leadSource.default("WALK_IN"),
  campaignId: uuid.optional().nullable(),
  counsellorId: uuid.optional().nullable(),
  preferredMode: learningMode.optional().nullable(),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
});
export type LeadInput = z.infer<typeof leadSchema>;

export const leadStageChangeSchema = z.object({
  leadId: uuid,
  stage: leadStage,
  lostReason: z.string().trim().max(300).optional(),
  note: z.string().trim().max(1000).optional(),
});

export const leadActivitySchema = z.object({
  leadId: uuid,
  type: leadActivityType,
  summary: nonEmpty.max(300),
  details: z.string().trim().max(2000).optional(),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
});

export const leadTaskSchema = z.object({
  leadId: uuid,
  title: nonEmpty.max(200),
  dueAt: z.coerce.date().optional().nullable(),
  assigneeId: uuid.optional().nullable(),
});

export const leadNoteSchema = z.object({ leadId: uuid, body: nonEmpty.max(4000) });

export const campaignSchema = z.object({
  name: nonEmpty.max(120),
  source: leadSource,
  utmSource: z.string().max(80).optional().or(z.literal("")),
  utmMedium: z.string().max(80).optional().or(z.literal("")),
  utmCampaign: z.string().max(120).optional().or(z.literal("")),
  budget: z.coerce.number().min(0).optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
});

/** Online admission application. */
export const applicationSchema = z.object({
  courseId: uuid,
  preferredMode: learningMode,
  preferredBatchId: uuid.optional().nullable(),
  personal: z.object({
    firstName: nonEmpty.max(60),
    lastName: nonEmpty.max(60),
    email,
    phone,
    whatsapp: phone.optional().or(z.literal("")),
    city: nonEmpty.max(80),
    dateOfBirth: z.string().max(20).optional().or(z.literal("")),
    gender: z.enum(["male", "female", "other", "prefer_not"]).optional(),
    address: z.string().trim().max(300).optional().or(z.literal("")),
  }),
  education: z.array(z.object({ level: nonEmpty.max(60), institution: nonEmpty.max(120), field: z.string().max(120).optional().or(z.literal("")), year: z.string().max(10).optional().or(z.literal("")) })).min(1).max(6),
  experience: z.array(z.object({ title: nonEmpty.max(100), company: z.string().max(120).optional().or(z.literal("")), years: z.coerce.number().min(0).max(50).optional() })).max(6).default([]),
  goals: z.string().trim().min(20, "Tell us a little more about your goals").max(2000),
  documents: z.array(z.object({ kind: z.enum(["CNIC", "TRANSCRIPT", "PHOTO", "CV", "OTHER"]), mediaId: uuid })).max(10).default([]),
  acceptTerms: z.literal(true, { message: "Please accept the admission terms" }),
});
export type ApplicationInput = z.infer<typeof applicationSchema>;

export const applicationDecisionSchema = z.object({
  applicationId: uuid,
  decision: z.enum(["APPROVED", "REJECTED", "WAITLISTED", "UNDER_REVIEW"]),
  note: z.string().trim().max(1000).optional(),
  batchId: uuid.optional().nullable(),
  feePlanId: uuid.optional().nullable(),
});
