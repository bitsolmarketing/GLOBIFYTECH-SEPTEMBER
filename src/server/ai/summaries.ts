import "server-only";
import { generateText } from "ai";
import { prisma } from "@/server/db/prisma";
import { getModel, BRAND_VOICE, isAiConfigured } from "./provider";
import { log } from "@/server/log";

/** Job: summarise a completed live class from its transcript/notes. Skips silently when AI isn't configured. */
export async function summarizeLiveClass(liveClassId: string) {
  if (!isAiConfigured()) return;
  const lc = await prisma.liveClass.findUnique({ where: { id: liveClassId }, select: { title: true, notes: true, transcript: true, course: { select: { title: true } } } });
  if (!lc || (!lc.transcript && !lc.notes)) return;
  try {
    const { text } = await generateText({
      model: await getModel(),
      system: `${BRAND_VOICE}\nSummarise a live class for students who missed it. Output: 1) three-sentence overview, 2) key points as bullets, 3) action items / homework, 4) three revision questions. Keep it under 300 words.`,
      prompt: `Course: ${lc.course.title}\nClass: ${lc.title}\n\nNotes:\n${lc.notes ?? "—"}\n\nTranscript:\n${(lc.transcript ?? "").slice(0, 30000)}`,
      maxOutputTokens: 700,
    });
    await prisma.liveClass.update({ where: { id: liveClassId }, data: { aiSummary: text } });
  } catch (error) {
    log.warn("live class summary failed", { liveClassId, error: (error as Error).message });
  }
}

/** Human-readable explanation for a risk score (used on the student detail page). */
export async function explainRisk(riskScoreId: string): Promise<string | null> {
  if (!isAiConfigured()) return null;
  const r = await prisma.studentRiskScore.findUnique({ where: { id: riskScoreId }, include: { student: { select: { user: { select: { name: true } } } } } });
  if (!r) return null;
  try {
    const { text } = await generateText({
      model: await getModel(),
      system: `${BRAND_VOICE}\nYou advise counsellors. Given risk signals, write a 4–5 sentence note: what's happening, the most likely cause, and one concrete next step for the counsellor and one for the instructor. Be specific and kind.`,
      prompt: `Student: ${r.student.user.name}\nRisk level: ${r.level} (${r.score}/100)\nReasons: ${r.reasons.join("; ")}\nSignals: ${JSON.stringify(r.signals)}`,
      maxOutputTokens: 300,
    });
    return text;
  } catch (error) {
    log.warn("risk explanation failed", { riskScoreId, error: (error as Error).message });
    return null;
  }
}

/** Monthly narrative report for admins (numbers come from analytics, the model only narrates). */
export async function narrateMonthlyReport(data: Record<string, unknown>): Promise<string | null> {
  if (!isAiConfigured()) return null;
  try {
    const { text } = await generateText({
      model: await getModel(),
      system: `${BRAND_VOICE}\nWrite a one-page monthly operations report for the institute director. Use only the numbers provided. Structure: Headline · Admissions · Learning · Finance · Risks · Recommendations (3 bullets).`,
      prompt: JSON.stringify(data),
      maxOutputTokens: 900,
    });
    return text;
  } catch (error) {
    log.warn("monthly narrative failed", { error: (error as Error).message });
    return null;
  }
}
