/**
 * Quiz auto-grading (pure). Handles every objective question type; subjective
 * types are flagged for manual grading and score 0 until an instructor grades.
 */
export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MULTIPLE_SELECT"
  | "TRUE_FALSE"
  | "SHORT_ANSWER"
  | "LONG_ANSWER"
  | "FILL_BLANK"
  | "MATCHING"
  | "ORDERING"
  | "IMAGE"
  | "CODE";

export interface GradableQuestion {
  id: string;
  type: QuestionType;
  points: number;
  topic?: string | null;
  options: Array<{ id: string; isCorrect: boolean; matchKey?: string | null; order: number }>;
  /** SHORT_ANSWER / FILL_BLANK: { accepted: string[] }, ORDERING: { order: string[] }, MATCHING: { pairs: Record<optionId, matchKey> } */
  answerKey?: unknown;
}

export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIds?: string[];
  textAnswer?: string | null;
  structured?: unknown;
}

export interface GradedAnswer {
  questionId: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
  needsManualGrading: boolean;
}

export interface GradeResult {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  needsManualGrading: boolean;
  weakTopics: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

function gradeOne(q: GradableQuestion, a: SubmittedAnswer | undefined, negativeMarking: number): GradedAnswer {
  const base = { questionId: q.id, needsManualGrading: false };
  if (!a) return { ...base, isCorrect: false, pointsAwarded: 0 };
  const key = (q.answerKey ?? {}) as Record<string, unknown>;

  switch (q.type) {
    case "MULTIPLE_CHOICE":
    case "TRUE_FALSE":
    case "IMAGE": {
      const correct = q.options.filter((o) => o.isCorrect).map((o) => o.id);
      const chosen = a.selectedOptionIds ?? [];
      const isCorrect = chosen.length === 1 && correct.includes(chosen[0]!);
      return { ...base, isCorrect, pointsAwarded: isCorrect ? q.points : chosen.length ? -negativeMarking * q.points : 0 };
    }
    case "MULTIPLE_SELECT": {
      const correct = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
      const chosen = new Set(a.selectedOptionIds ?? []);
      if (chosen.size === 0) return { ...base, isCorrect: false, pointsAwarded: 0 };
      const isCorrect = correct.size === chosen.size && [...correct].every((id) => chosen.has(id));
      if (isCorrect) return { ...base, isCorrect: true, pointsAwarded: q.points };
      // Partial credit: fraction of correct picks minus wrong picks, floored at 0
      const right = [...chosen].filter((id) => correct.has(id)).length;
      const wrong = chosen.size - right;
      const fraction = Math.max(0, (right - wrong) / Math.max(1, correct.size));
      return { ...base, isCorrect: false, pointsAwarded: Math.round(fraction * q.points * 100) / 100 };
    }
    case "SHORT_ANSWER":
    case "FILL_BLANK": {
      const accepted = Array.isArray(key.accepted) ? (key.accepted as string[]).map(norm) : [];
      const given = norm(a.textAnswer ?? "");
      if (!accepted.length) return { ...base, isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
      const isCorrect = given.length > 0 && accepted.includes(given);
      return { ...base, isCorrect, pointsAwarded: isCorrect ? q.points : 0 };
    }
    case "ORDERING": {
      const expected = Array.isArray(key.order) ? (key.order as string[]) : q.options.slice().sort((x, y) => x.order - y.order).map((o) => o.id);
      const given = Array.isArray(a.structured) ? (a.structured as string[]) : [];
      const isCorrect = expected.length === given.length && expected.every((id, i) => id === given[i]);
      return { ...base, isCorrect, pointsAwarded: isCorrect ? q.points : 0 };
    }
    case "MATCHING": {
      const pairs = (key.pairs ?? Object.fromEntries(q.options.map((o) => [o.id, o.matchKey ?? ""]))) as Record<string, string>;
      const given = (a.structured ?? {}) as Record<string, string>;
      const total = Object.keys(pairs).length;
      if (!total) return { ...base, isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
      const right = Object.entries(pairs).filter(([id, k]) => given[id] === k).length;
      const isCorrect = right === total;
      return { ...base, isCorrect, pointsAwarded: Math.round((right / total) * q.points * 100) / 100 };
    }
    case "LONG_ANSWER":
    case "CODE":
    default:
      return { ...base, isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
  }
}

export function gradeQuiz(params: { questions: GradableQuestion[]; answers: SubmittedAnswer[]; passingScore: number; negativeMarking?: number }): GradeResult {
  const negative = params.negativeMarking ?? 0;
  const byId = new Map(params.answers.map((a) => [a.questionId, a]));
  const answers = params.questions.map((q) => gradeOne(q, byId.get(q.id), negative));
  const maxScore = params.questions.reduce((sum, q) => sum + q.points, 0);
  const score = Math.max(0, Math.round(answers.reduce((sum, a) => sum + a.pointsAwarded, 0) * 100) / 100);
  const percent = maxScore ? Math.round((score / maxScore) * 10000) / 100 : 0;
  const needsManualGrading = answers.some((a) => a.needsManualGrading);

  const topicStats = new Map<string, { total: number; missed: number }>();
  for (const q of params.questions) {
    if (!q.topic) continue;
    const graded = answers.find((a) => a.questionId === q.id)!;
    const s = topicStats.get(q.topic) ?? { total: 0, missed: 0 };
    s.total += 1;
    if (graded.isCorrect === false) s.missed += 1;
    topicStats.set(q.topic, s);
  }
  const weakTopics = [...topicStats.entries()].filter(([, s]) => s.missed / s.total >= 0.5).map(([t]) => t);

  return { answers, score, maxScore, percent, passed: !needsManualGrading && percent >= params.passingScore, needsManualGrading, weakTopics };
}

/** Deterministic shuffle so a given attempt always shows the same order. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const j = Math.abs(h >>> 0) % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
