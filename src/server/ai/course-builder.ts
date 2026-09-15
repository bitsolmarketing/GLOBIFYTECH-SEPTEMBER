import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { getModel, BRAND_VOICE, aiProviderInfo } from "./provider";
import { enforceRateLimit } from "@/server/rate-limit";
import { slugify } from "@/lib/utils";

export const courseBriefSchema = z.object({
  courseName: z.string().min(3).max(140),
  audience: z.string().min(3).max(300),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  durationWeeks: z.number().int().min(1).max(52),
  hoursPerWeek: z.number().int().min(1).max(40).default(6),
  learningGoals: z.array(z.string().min(3).max(200)).min(1).max(10),
  notes: z.string().max(1000).optional(),
  courseId: z.string().uuid().optional().nullable(),
});
export type CourseBrief = z.infer<typeof courseBriefSchema>;

export const outlineSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  shortDescription: z.string(),
  outcomes: z.array(z.string()).min(3).max(10),
  prerequisites: z.array(z.string()).max(6),
  skills: z.array(z.string()).min(3).max(12),
  modules: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        lessons: z.array(z.object({ title: z.string(), type: z.enum(["VIDEO", "TEXT", "LIVE"]), objectives: z.array(z.string()).min(1).max(4), durationMinutes: z.number().int().min(5).max(180) })).min(2).max(8),
        quiz: z.object({ title: z.string(), questions: z.array(z.object({ prompt: z.string(), options: z.array(z.string()).length(4), correctIndex: z.number().int().min(0).max(3), topic: z.string(), explanation: z.string() })).min(3).max(8) }).optional(),
        assignment: z.object({ title: z.string(), instructions: z.string(), maxPoints: z.number().int().min(10).max(100) }).optional(),
      }),
    )
    .min(3)
    .max(12),
  project: z.object({ title: z.string(), overview: z.string(), requirements: z.array(z.string()).min(3).max(10), skills: z.array(z.string()).min(2).max(8), milestones: z.array(z.string()).min(2).max(6) }),
  resources: z.array(z.object({ title: z.string(), url: z.string().url().optional() })).max(10),
});
export type CourseOutline = z.infer<typeof outlineSchema>;

/** Generates a full course draft. The result is stored as an AIGeneration in DRAFT status — never published directly. */
export async function generateCourseOutline(brief: CourseBrief, requestedById: string) {
  await enforceRateLimit(`ai:builder:${requestedById}`, 10, 3600);
  const model = await getModel();
  const { object, usage } = await generateObject({
    model,
    schema: outlineSchema,
    system: `${BRAND_VOICE}\nYou design practical, project-first curricula. Every module must produce something a student can show a client or employer. Lessons are short and concrete. Quizzes test understanding, not memorisation. Avoid filler.`,
    prompt: `Design a ${brief.durationWeeks}-week course (${brief.hoursPerWeek} hours/week).
Course name: ${brief.courseName}
Audience: ${brief.audience}
Difficulty: ${brief.difficulty}
Learning goals:\n${brief.learningGoals.map((g) => `- ${g}`).join("\n")}
${brief.notes ? `Notes from the instructor: ${brief.notes}` : ""}
Aim for roughly one module per week. Include a quiz for most modules, an assignment for at least half, and one capstone project.`,
    maxOutputTokens: 8000,
    temperature: 0.5,
  });
  const info = aiProviderInfo();
  return prisma.aIGeneration.create({ data: { kind: "COURSE_OUTLINE", requestedById, courseId: brief.courseId ?? null, input: brief as never, output: object as never, provider: info.provider, model: info.model, status: "DRAFT" }, select: { id: true, output: true, createdAt: true } });
}

export async function reviewGeneration(id: string, decision: "APPROVED" | "REJECTED", approvedById: string) {
  const g = await prisma.aIGeneration.findUnique({ where: { id } });
  if (!g) throw AppError.notFound("AI draft");
  if (g.status === "APPLIED") throw AppError.conflict("This draft has already been applied.");
  return prisma.aIGeneration.update({ where: { id }, data: { status: decision, approvedById, approvedAt: new Date() } });
}

/**
 * Applies an APPROVED outline to the catalogue as DRAFT content: a new course
 * (or modules appended to an existing one), lessons, quizzes and assignments.
 * Everything stays unpublished until a human publishes it.
 */
export async function applyGeneration(id: string, actorId: string, options: { courseId?: string | null; categoryId?: string | null } = {}) {
  const g = await prisma.aIGeneration.findUnique({ where: { id } });
  if (!g) throw AppError.notFound("AI draft");
  if (g.status !== "APPROVED") throw AppError.validation("Approve the draft before applying it.");
  const outline = outlineSchema.parse(g.output);
  const brief = courseBriefSchema.parse(g.input);

  const courseId = await prisma.$transaction(async (tx) => {
    let cId = options.courseId ?? g.courseId ?? null;
    if (!cId) {
      let slug = slugify(outline.title);
      let i = 2;
      while (await tx.course.findUnique({ where: { slug } })) slug = `${slugify(outline.title)}-${i++}`;
      const course = await tx.course.create({ data: { slug, title: outline.title, subtitle: outline.subtitle, shortDescription: outline.shortDescription, level: brief.difficulty, durationWeeks: brief.durationWeeks, hoursPerWeek: brief.hoursPerWeek, outcomes: outline.outcomes, prerequisites: outline.prerequisites, status: "DRAFT", categoryId: options.categoryId ?? null, createdById: actorId, completionRules: { create: {} } } });
      cId = course.id;
      for (const name of outline.skills) {
        const skill = await tx.skill.upsert({ where: { slug: slugify(name) }, update: {}, create: { slug: slugify(name), name } });
        await tx.courseSkill.upsert({ where: { courseId_skillId: { courseId: cId, skillId: skill.id } }, update: {}, create: { courseId: cId, skillId: skill.id } });
      }
    }
    const moduleOffset = await tx.courseModule.count({ where: { courseId: cId } });
    for (const [mi, m] of outline.modules.entries()) {
      const module = await tx.courseModule.create({ data: { courseId: cId, title: m.title, description: m.description, order: moduleOffset + mi, isPublished: false } });
      const unit = await tx.courseUnit.create({ data: { moduleId: module.id, title: m.title, order: 0 } });
      let li = 0;
      for (const l of m.lessons) {
        await tx.lesson.create({ data: { unitId: unit.id, title: l.title, slug: `${slugify(l.title)}-${li}`, type: l.type, objectives: l.objectives, durationSeconds: l.durationMinutes * 60, order: li++, isPublished: false } });
      }
      if (m.quiz) {
        const quiz = await tx.quiz.create({ data: { courseId: cId, title: m.quiz.title, isPublished: false } });
        for (const [qi, q] of m.quiz.questions.entries()) {
          await tx.question.create({ data: { quizId: quiz.id, type: "MULTIPLE_CHOICE", prompt: q.prompt, explanation: q.explanation, topic: q.topic, order: qi, options: { create: q.options.map((text, oi) => ({ text, isCorrect: oi === q.correctIndex, order: oi })) } } });
        }
        await tx.lesson.create({ data: { unitId: unit.id, title: m.quiz.title, slug: `quiz-${slugify(m.quiz.title)}`, type: "QUIZ", quizId: quiz.id, order: li++, isPublished: false } });
      }
      if (m.assignment) {
        const a = await tx.assignment.create({ data: { courseId: cId, title: m.assignment.title, instructions: `<p>${m.assignment.instructions}</p>`, maxPoints: m.assignment.maxPoints, allowedKinds: ["TEXT", "FILE", "URL"], isPublished: false } });
        await tx.lesson.create({ data: { unitId: unit.id, title: m.assignment.title, slug: `assignment-${slugify(m.assignment.title)}`, type: "ASSIGNMENT", assignmentId: a.id, order: li++, isPublished: false } });
      }
    }
    const projectCount = await tx.project.count({ where: { courseId: cId } });
    await tx.project.create({ data: { courseId: cId, title: outline.project.title, overview: outline.project.overview, requirements: `<ul>${outline.project.requirements.map((r) => `<li>${r}</li>`).join("")}</ul>`, skills: outline.project.skills, resources: outline.resources as never, isPublished: false, order: projectCount, milestones: { create: outline.project.milestones.map((title, order) => ({ title, order })) } } });
    await tx.aIGeneration.update({ where: { id }, data: { status: "APPLIED", appliedAt: new Date(), courseId: cId } });
    return cId;
  });
  return courseId;
}

export async function listGenerations(filters: { status?: "DRAFT" | "APPROVED" | "REJECTED" | "APPLIED"; kind?: string; requestedById?: string }) {
  return prisma.aIGeneration.findMany({ where: { ...(filters.status ? { status: filters.status } : {}), ...(filters.kind ? { kind: filters.kind } : {}), ...(filters.requestedById ? { requestedById: filters.requestedById } : {}) }, orderBy: { createdAt: "desc" }, take: 50, include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } }, course: { select: { id: true, title: true } } } });
}

export async function getGeneration(id: string) {
  const g = await prisma.aIGeneration.findUnique({ where: { id }, include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } }, course: { select: { id: true, title: true } } } });
  if (!g) throw AppError.notFound("AI draft");
  return g;
}
