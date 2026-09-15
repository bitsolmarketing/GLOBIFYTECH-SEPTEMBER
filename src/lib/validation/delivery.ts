import { z } from "zod";
import { nonEmpty, uuid, url } from "./common";
import { learningMode } from "./course";

export const batchStatus = z.enum(["PLANNED", "OPEN", "RUNNING", "COMPLETED", "CANCELLED"]);
export const attendanceStatus = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]);
export const attendanceMethod = z.enum(["MANUAL", "QR", "STUDENT_PORTAL", "INSTRUCTOR_PORTAL"]);
export const liveProvider = z.enum(["ZOOM", "GOOGLE_MEET", "MICROSOFT_TEAMS", "MANUAL"]);

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const batchSchema = z.object({
  code: z.string().trim().min(3).max(30).regex(/^[A-Z0-9-]+$/i, "Letters, numbers and hyphens").transform((v) => v.toUpperCase()),
  name: nonEmpty.max(120),
  courseId: uuid,
  campusId: uuid.optional().nullable(),
  classroomId: uuid.optional().nullable(),
  instructorId: uuid.optional().nullable(),
  mode: learningMode.default("HYBRID"),
  capacity: z.coerce.number().int().min(1).max(500).default(18),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  status: batchStatus.default("PLANNED"),
  timezone: z.string().max(60).default("Asia/Karachi"),
  schedule: z.array(z.object({ dayOfWeek: z.coerce.number().int().min(0).max(6), startTime: time, endTime: time })).max(7).default([]),
});
export type BatchInput = z.infer<typeof batchSchema>;

export const batchStudentsSchema = z.object({ batchId: uuid, studentIds: z.array(uuid).min(1).max(200) });

export const liveClassSchema = z.object({
  courseId: uuid,
  batchId: uuid.optional().nullable(),
  lessonId: uuid.optional().nullable(),
  title: nonEmpty.max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  provider: liveProvider.default("MANUAL"),
  meetingUrl: url.optional().or(z.literal("")),
  meetingId: z.string().max(80).optional().or(z.literal("")),
  meetingPasscode: z.string().max(40).optional().or(z.literal("")),
}).refine((d) => d.endsAt > d.startsAt, { path: ["endsAt"], message: "End time must be after start time" });
export type LiveClassInput = z.infer<typeof liveClassSchema>;

export const liveClassUpdateSchema = z.object({
  liveClassId: uuid,
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"]).optional(),
  notes: z.string().trim().max(10000).optional().or(z.literal("")),
  recordingUrl: url.optional().or(z.literal("")),
  recordingMediaId: uuid.optional().nullable(),
  transcript: z.string().max(200000).optional().or(z.literal("")),
});

export const markAttendanceSchema = z.object({
  batchId: uuid,
  sessionDate: z.coerce.date(),
  liveClassId: uuid.optional().nullable(),
  method: attendanceMethod.default("INSTRUCTOR_PORTAL"),
  entries: z.array(z.object({ studentId: uuid, status: attendanceStatus, note: z.string().max(200).optional().or(z.literal("")) })).min(1).max(500),
});

export const qrAttendanceSchema = z.object({ token: z.string().min(10).max(500) });

export const classroomSchema = z.object({
  campusId: uuid,
  name: nonEmpty.max(60),
  capacity: z.coerce.number().int().min(1).max(500).default(18),
  floor: z.string().max(30).optional().or(z.literal("")),
  equipment: z.array(z.string().max(60)).max(20).default([]),
});

export const campusSchema = z.object({
  code: z.string().trim().min(2).max(10).regex(/^[A-Z0-9]+$/i).transform((v) => v.toUpperCase()),
  name: nonEmpty.max(100),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  city: nonEmpty.max(80),
  country: z.string().length(2).default("PK"),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  timezone: z.string().max(60).default("Asia/Karachi"),
  isActive: z.coerce.boolean().default(true),
});

export const enrollmentSchema = z.object({
  studentId: uuid,
  courseId: uuid,
  batchId: uuid.optional().nullable(),
  source: z.enum(["ADMISSION", "DIRECT", "SCHOLARSHIP", "MANUAL"]).default("MANUAL"),
  createInvoice: z.boolean().default(false),
  feePlanId: uuid.optional().nullable(),
});
