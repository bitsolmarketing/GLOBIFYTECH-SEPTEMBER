import "server-only";
import { streamText, type ModelMessage } from "ai";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/errors";
import { stripHtml } from "@/lib/sanitize";
import { toNumber } from "@/lib/utils";
import { getModel, BRAND_VOICE } from "./provider";
import { requireEnrollment } from "@/server/services/enrollments";
import { enforceRateLimit } from "@/server/rate-limit";

export interface TutorContext {
  courseId?: string | null;
  lessonId?: string | null;
}

/**
 * Builds the tutor's grounding: current course, module, lesson content,
 * resources, the student's progress and recent performance. Only data the
 * student is entitled to see is included.
 */
async function buildGrounding(studentId: string, ctx: TutorContext) {
  const parts: string[] = [];
  let lesson: { id: string; title: string; content: string | null; objectives: string[]; unit: { title: string; module: { title: string; courseId: string } }; resources: Array<{ title: string; url: string | null }> } | null = null;
  if (ctx.lessonId) {
    lesson = await prisma.lesson.findUnique({ where: { id: ctx.lessonId }, select: { id: true, title: true, content: true, objectives: true, unit: { select: { title: true, module: { select: { title: true, courseId: true } } } }, resources: { select: { title: true, url: true } } } });
    if (lesson) ctx.courseId = lesson.unit.module.courseId;
  }
  if (!ctx.courseId) return { text: "The student is browsing their dashboard; no specific course is open.", courseTitle: null, graded: false };
  const enrollment = await requireEnrollment(studentId, ctx.courseId);
  const course = await prisma.course.findUniqueOrThrow({ where: { id: ctx.courseId }, select: { title: true, outcomes: true, modules: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { title: true, units: { orderBy: { order: "asc" }, select: { lessons: { where: { isPublished: true }, orderBy: { order: "asc" }, select: { id: true, title: true } } } } } } } });
  const outline = course.modules.map((m, i) => `${i + 1}. ${m.title}: ${m.units.flatMap((u) => u.lessons.map((l) => l.title)).join("; ")}`).join("\n");
  parts.push(`COURSE: ${course.title}\nOutcomes: ${course.outcomes.join("; ") || "—"}\nOutline:\n${outline}`);
  parts.push(`STUDENT PROGRESS: ${toNumber(enrollment.progress?.percent ?? 0)}% (${enrollment.progress?.lessonsCompleted ?? 0}/${enrollment.progress?.lessonsTotal ?? 0} lessons).`);
  const attempts = await prisma.quizAttempt.findMany({ where: { enrollmentId: enrollment.id, status: "GRADED" }, orderBy: { submittedAt: "desc" }, take: 5, select: { percent: true, weakTopics: true, quiz: { select: { title: true } } } });
  if (attempts.length) parts.push(`RECENT QUIZZES: ${attempts.map((a) => `${a.quiz.title} ${toNumber(a.percent)}%${a.weakTopics.length ? ` (weak: ${a.weakTopics.join(", ")})` : ""}`).join("; ")}`);
  let graded = false;
  if (lesson) {
    const gradedLink = await prisma.lesson.findUnique({ where: { id: lesson.id }, select: { quizId: true, assignmentId: true, projectId: true } });
    graded = !!(gradedLink?.quizId || gradedLink?.assignmentId || gradedLink?.projectId);
    parts.push(`CURRENT LESSON: "${lesson.title}" (module "${lesson.unit.module.title}", unit "${lesson.unit.title}")\nObjectives: ${lesson.objectives.join("; ") || "—"}\nContent excerpt:\n${stripHtml(lesson.content).slice(0, 6000) || "(video lesson — no transcript available)"}\nResources: ${lesson.resources.map((r) => `${r.title}${r.url ? ` <${r.url}>` : ""}`).join("; ") || "—"}`);
  }
  return { text: parts.join("\n\n"), courseTitle: course.title, graded };
}

const TUTOR_RULES = `Your job is to TEACH, not to do the work.
- Explain concepts with examples relevant to Pakistani learners and real client work.
- When asked "quiz me", ask 3–5 short questions one at a time and give feedback.
- When asked "what should I learn next" or "where am I weak", use the progress and quiz data provided.
- For graded quizzes, assignments or projects: never write the final submission or give answer keys. Guide with hints, structure, and questions; offer to review the student's own attempt.
- If a question is outside the course, answer briefly and connect it back to the learner's path.
- Keep answers under ~250 words unless asked for depth.`;

export async function tutorStream(params: { userId: string; studentId: string; conversationId?: string | null; message: string; context: TutorContext }) {
  await enforceRateLimit(`ai:tutor:${params.userId}`, 40, 3600);
  const model = await getModel();
  const grounding = await buildGrounding(params.studentId, params.context);

  let conversation = params.conversationId ? await prisma.aIConversation.findFirst({ where: { id: params.conversationId, userId: params.userId } }) : null;
  if (!conversation) {
    conversation = await prisma.aIConversation.create({ data: { userId: params.userId, contextType: "TUTOR", courseId: params.context.courseId ?? null, lessonId: params.context.lessonId ?? null, title: params.message.slice(0, 80) } });
  }
  const history = await prisma.aIMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: "asc" }, take: 30 });
  await prisma.aIMessage.create({ data: { conversationId: conversation.id, role: "USER", content: params.message } });

  const messages: ModelMessage[] = [
    ...history.filter((m) => m.role === "USER" || m.role === "ASSISTANT").map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content })),
    { role: "user", content: params.message },
  ];

  const result = streamText({
    model,
    system: `${BRAND_VOICE}\n\n${TUTOR_RULES}\n\n${grounding.graded ? "NOTE: the current lesson is linked to graded work. Apply the graded-work rule strictly." : ""}\n\nCONTEXT:\n${grounding.text}`,
    messages,
    maxOutputTokens: 900,
    temperature: 0.4,
    onFinish: async ({ text, usage }) => {
      await prisma.aIMessage.create({ data: { conversationId: conversation!.id, role: "ASSISTANT", content: text, tokens: usage.totalTokens ?? null } });
      await prisma.aIConversation.update({ where: { id: conversation!.id }, data: { tokensUsed: { increment: usage.totalTokens ?? 0 }, provider: (await import("./provider")).aiProviderInfo().provider, model: (await import("./provider")).aiProviderInfo().model } });
    },
  });
  return { result, conversationId: conversation.id };
}

export async function listTutorConversations(userId: string) {
  return prisma.aIConversation.findMany({ where: { userId, contextType: "TUTOR" }, orderBy: { updatedAt: "desc" }, take: 30, select: { id: true, title: true, updatedAt: true, courseId: true } });
}

export async function getConversationMessages(conversationId: string, userId: string) {
  const c = await prisma.aIConversation.findFirst({ where: { id: conversationId, userId } });
  if (!c) throw AppError.notFound("Conversation");
  return prisma.aIMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } });
}
