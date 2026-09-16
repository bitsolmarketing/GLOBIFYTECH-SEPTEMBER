import { describe, expect, it } from "vitest";
import { gradeQuiz, seededShuffle, type GradableQuestion } from "@/lib/quiz-grading";

const option = (id: string, isCorrect = false, order = 0, matchKey?: string) => ({ id, isCorrect, order, matchKey: matchKey ?? null });

const mcq: GradableQuestion = { id: "q1", type: "MULTIPLE_CHOICE", points: 2, topic: "basics", options: [option("a", true), option("b"), option("c")] };
const multi: GradableQuestion = { id: "q2", type: "MULTIPLE_SELECT", points: 4, topic: "basics", options: [option("a", true), option("b", true), option("c"), option("d")] };
const short: GradableQuestion = { id: "q3", type: "SHORT_ANSWER", points: 2, options: [], answerKey: { accepted: ["Search Engine Optimisation", "SEO"] } };
const essay: GradableQuestion = { id: "q4", type: "LONG_ANSWER", points: 10, options: [] };
const ordering: GradableQuestion = { id: "q5", type: "ORDERING", points: 3, options: [option("s1", false, 0), option("s2", false, 1), option("s3", false, 2)] };
const matching: GradableQuestion = { id: "q6", type: "MATCHING", points: 4, options: [option("m1", false, 0, "k1"), option("m2", false, 1, "k2")] };

describe("quiz auto-grading", () => {
  it("awards full points for a correct single choice", () => {
    const r = gradeQuiz({ questions: [mcq], answers: [{ questionId: "q1", selectedOptionIds: ["a"] }], passingScore: 60 });
    expect(r.score).toBe(2);
    expect(r.percent).toBe(100);
    expect(r.passed).toBe(true);
  });

  it("gives nothing for a wrong single choice when negative marking is off", () => {
    const r = gradeQuiz({ questions: [mcq], answers: [{ questionId: "q1", selectedOptionIds: ["b"] }], passingScore: 60 });
    expect(r.score).toBe(0);
    expect(r.passed).toBe(false);
  });

  it("applies negative marking to a wrong answer but never below zero overall", () => {
    const r = gradeQuiz({ questions: [mcq], answers: [{ questionId: "q1", selectedOptionIds: ["b"] }], passingScore: 60, negativeMarking: 0.25 });
    expect(r.answers[0]!.pointsAwarded).toBeLessThan(0);
    expect(r.score).toBe(0);
  });

  it("does not penalise an unanswered question", () => {
    const r = gradeQuiz({ questions: [mcq], answers: [], passingScore: 60, negativeMarking: 0.25 });
    expect(r.answers[0]!.pointsAwarded).toBe(0);
    expect(r.answers[0]!.isCorrect).toBe(false);
  });

  it("awards full points when every correct option is selected", () => {
    const r = gradeQuiz({ questions: [multi], answers: [{ questionId: "q2", selectedOptionIds: ["a", "b"] }], passingScore: 60 });
    expect(r.score).toBe(4);
  });

  it("gives partial credit for a partly correct multi-select", () => {
    const r = gradeQuiz({ questions: [multi], answers: [{ questionId: "q2", selectedOptionIds: ["a"] }], passingScore: 60 });
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThan(4);
  });

  it("cancels partial credit when wrong picks match right picks", () => {
    const r = gradeQuiz({ questions: [multi], answers: [{ questionId: "q2", selectedOptionIds: ["a", "c"] }], passingScore: 60 });
    expect(r.score).toBe(0);
  });

  it("accepts any listed short answer, ignoring case and spacing", () => {
    for (const text of ["seo", "  SEO ", "search engine optimisation"]) {
      const r = gradeQuiz({ questions: [short], answers: [{ questionId: "q3", textAnswer: text }], passingScore: 60 });
      expect(r.score).toBe(2);
    }
  });

  it("rejects a short answer that is not in the accepted list", () => {
    const r = gradeQuiz({ questions: [short], answers: [{ questionId: "q3", textAnswer: "guesswork" }], passingScore: 60 });
    expect(r.score).toBe(0);
  });

  it("sends essays and code to a human and withholds the pass", () => {
    const r = gradeQuiz({ questions: [essay], answers: [{ questionId: "q4", textAnswer: "A long answer." }], passingScore: 50 });
    expect(r.needsManualGrading).toBe(true);
    expect(r.answers[0]!.isCorrect).toBeNull();
    expect(r.passed).toBe(false);
  });

  it("grades ordering only when the whole sequence is right", () => {
    const right = gradeQuiz({ questions: [ordering], answers: [{ questionId: "q5", structured: ["s1", "s2", "s3"] }], passingScore: 60 });
    const wrong = gradeQuiz({ questions: [ordering], answers: [{ questionId: "q5", structured: ["s2", "s1", "s3"] }], passingScore: 60 });
    expect(right.score).toBe(3);
    expect(wrong.score).toBe(0);
  });

  it("gives proportional credit for matching pairs", () => {
    const half = gradeQuiz({ questions: [matching], answers: [{ questionId: "q6", structured: { m1: "k1", m2: "wrong" } }], passingScore: 60 });
    const all = gradeQuiz({ questions: [matching], answers: [{ questionId: "q6", structured: { m1: "k1", m2: "k2" } }], passingScore: 60 });
    expect(half.score).toBe(2);
    expect(all.score).toBe(4);
    expect(all.answers[0]!.isCorrect).toBe(true);
  });

  it("computes the percentage against the total points available", () => {
    const r = gradeQuiz({ questions: [mcq, multi], answers: [{ questionId: "q1", selectedOptionIds: ["a"] }], passingScore: 30 });
    expect(r.maxScore).toBe(6);
    expect(r.percent).toBeCloseTo(33.33, 1);
    expect(r.passed).toBe(true);
  });

  it("returns zero rather than dividing by zero for an empty quiz", () => {
    const r = gradeQuiz({ questions: [], answers: [], passingScore: 60 });
    expect(r.maxScore).toBe(0);
    expect(r.percent).toBe(0);
  });

  it("names the topics a student keeps getting wrong", () => {
    const r = gradeQuiz({ questions: [mcq, multi], answers: [{ questionId: "q1", selectedOptionIds: ["b"] }, { questionId: "q2", selectedOptionIds: ["c"] }], passingScore: 60 });
    expect(r.weakTopics).toContain("basics");
  });

  it("leaves topics out of the weak list when the student did well", () => {
    const r = gradeQuiz({ questions: [mcq, multi], answers: [{ questionId: "q1", selectedOptionIds: ["a"] }, { questionId: "q2", selectedOptionIds: ["a", "b"] }], passingScore: 60 });
    expect(r.weakTopics).toHaveLength(0);
  });
});

describe("seeded shuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("gives the same order for the same seed", () => {
    expect(seededShuffle(items, "attempt-1")).toEqual(seededShuffle(items, "attempt-1"));
  });

  it("gives a different order for a different seed", () => {
    expect(seededShuffle(items, "attempt-1")).not.toEqual(seededShuffle(items, "attempt-2"));
  });

  it("keeps every item exactly once", () => {
    expect([...seededShuffle(items, "seed")].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input", () => {
    const original = [...items];
    seededShuffle(items, "seed");
    expect(items).toEqual(original);
  });
});
