import { z } from "zod";
import { nonEmpty, richText, uuid, url } from "./common";

export const questionType = z.enum(["MULTIPLE_CHOICE", "MULTIPLE_SELECT", "TRUE_FALSE", "SHORT_ANSWER", "LONG_ANSWER", "FILL_BLANK", "MATCHING", "ORDERING", "IMAGE", "CODE"]);
export const difficulty = z.enum(["EASY", "MEDIUM", "HARD"]);
export const submissionKind = z.enum(["TEXT", "FILE", "URL", "GITHUB", "WEBSITE"]);

export const questionSchema = z.object({
  type: questionType,
  prompt: nonEmpty.max(4000),
  explanation: z.string().trim().max(4000).optional().or(z.literal("")),
  imageMediaId: uuid.optional().nullable(),
  codeLanguage: z.string().max(30).optional().or(z.literal("")),
  codeStarter: z.string().max(10000).optional().or(z.literal("")),
  topic: z.string().trim().max(80).optional().or(z.literal("")),
  difficulty: difficulty.default("MEDIUM"),
  points: z.coerce.number().min(0).max(100).default(1),
  options: z.array(z.object({ id: uuid.optional(), text: nonEmpty.max(1000), isCorrect: z.boolean().default(false), matchKey: z.string().max(200).optional().nullable() })).max(12).default([]),
  answerKey: z.unknown().optional(),
});
export type QuestionInput = z.infer<typeof questionSchema>;

export const quizSchema = z.object({
  courseId: uuid,
  title: nonEmpty.max(140),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  timeLimitMinutes: z.coerce.number().int().min(1).max(600).optional().nullable(),
  attemptLimit: z.coerce.number().int().min(1).max(20).default(3),
  passingScore: z.coerce.number().int().min(0).max(100).default(60),
  negativeMarking: z.coerce.number().min(0).max(1).default(0),
  shuffleQuestions: z.coerce.boolean().default(true),
  shuffleOptions: z.coerce.boolean().default(true),
  questionsPerAttempt: z.coerce.number().int().min(1).max(200).optional().nullable(),
  showAnswersAfter: z.coerce.boolean().default(true),
  isPublished: z.coerce.boolean().default(false),
  availableFrom: z.coerce.date().optional().nullable(),
  availableTo: z.coerce.date().optional().nullable(),
});
export type QuizInput = z.infer<typeof quizSchema>;

export const quizSubmitSchema = z.object({
  attemptId: uuid,
  answers: z.array(z.object({ questionId: uuid, selectedOptionIds: z.array(uuid).max(12).optional(), textAnswer: z.string().max(10000).optional().nullable(), structured: z.unknown().optional() })).max(200),
});

export const rubricSchema = z.object({
  title: nonEmpty.max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  criteria: z.array(z.object({ id: uuid.optional(), title: nonEmpty.max(120), description: z.string().max(500).optional().or(z.literal("")), maxPoints: z.coerce.number().min(0).max(100) })).min(1).max(20),
});

export const assignmentSchema = z.object({
  courseId: uuid,
  title: nonEmpty.max(140),
  instructions: richText.optional(),
  allowedKinds: z.array(submissionKind).min(1).default(["TEXT", "FILE", "URL"]),
  maxPoints: z.coerce.number().min(1).max(1000).default(100),
  dueAt: z.coerce.date().optional().nullable(),
  allowLate: z.coerce.boolean().default(true),
  latePenaltyPercent: z.coerce.number().int().min(0).max(100).default(0),
  rubricId: uuid.optional().nullable(),
  isPublished: z.coerce.boolean().default(false),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const submissionSchema = z.object({
  assignmentId: uuid,
  kind: submissionKind,
  text: z.string().trim().max(50000).optional().or(z.literal("")),
  url: url.optional().or(z.literal("")),
  mediaIds: z.array(uuid).max(10).default([]),
  submit: z.boolean().default(true),
});

export const gradeSchema = z.object({
  submissionId: uuid,
  decision: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]),
  score: z.coerce.number().min(0).max(1000).optional().nullable(),
  feedback: z.string().trim().max(5000).optional().or(z.literal("")),
  rubricScores: z.array(z.object({ criterionId: uuid, points: z.coerce.number().min(0).max(100), comment: z.string().max(500).optional().or(z.literal("")) })).default([]),
});

export const projectSchema = z.object({
  courseId: uuid,
  title: nonEmpty.max(140),
  overview: z.string().trim().max(2000).optional().or(z.literal("")),
  requirements: richText.optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  resources: z.array(z.object({ title: nonEmpty.max(120), url: url })).max(20).default([]),
  deadline: z.coerce.date().optional().nullable(),
  maxPoints: z.coerce.number().min(1).max(1000).default(100),
  rubricId: uuid.optional().nullable(),
  addToPortfolio: z.coerce.boolean().default(true),
  isPublished: z.coerce.boolean().default(false),
  milestones: z.array(z.object({ id: uuid.optional(), title: nonEmpty.max(120), description: z.string().max(500).optional().or(z.literal("")), dueAt: z.coerce.date().optional().nullable() })).max(12).default([]),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const projectSubmissionSchema = z.object({
  projectId: uuid,
  title: z.string().trim().max(140).optional().or(z.literal("")),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  repoUrl: url.optional().or(z.literal("")),
  liveUrl: url.optional().or(z.literal("")),
  mediaIds: z.array(uuid).max(10).default([]),
  milestonesDone: z.array(uuid).max(12).default([]),
  submit: z.boolean().default(true),
});

export const examSchema = z.object({
  courseId: uuid,
  batchId: uuid.optional().nullable(),
  title: nonEmpty.max(140),
  kind: z.enum(["MIDTERM", "FINAL", "PRACTICAL", "MOCK"]).default("FINAL"),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  scheduledAt: z.coerce.date().optional().nullable(),
  durationMinutes: z.coerce.number().int().min(5).max(600).default(60),
  passingScore: z.coerce.number().int().min(0).max(100).default(50),
  attemptLimit: z.coerce.number().int().min(1).max(5).default(1),
  negativeMarking: z.coerce.number().min(0).max(1).default(0),
  shuffleQuestions: z.coerce.boolean().default(true),
  isPublished: z.coerce.boolean().default(false),
});
