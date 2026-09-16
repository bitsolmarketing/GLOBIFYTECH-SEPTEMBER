import { describe, expect, it } from "vitest";
import { evaluateCompletion, type CompletionRules, type CompletionSnapshot } from "@/lib/completion";

const rules = (over: Partial<CompletionRules> = {}): CompletionRules => ({
  requireAllLessons: true,
  minAttendancePercent: 75,
  minQuizPercent: 60,
  minExamPercent: null,
  requireProjects: true,
  requirePaymentClear: true,
  ...over,
});

const snapshot = (over: Partial<CompletionSnapshot> = {}): CompletionSnapshot => ({
  lessonsTotal: 20,
  lessonsCompleted: 20,
  attendancePercent: 90,
  quizPercents: [80, 70],
  examPercents: [],
  projectsTotal: 1,
  projectsApproved: 1,
  paymentClear: true,
  ...over,
});

const requirement = (r: ReturnType<typeof evaluateCompletion>, key: string) => r.requirements.find((x) => x.key === key)!;

describe("course completion engine", () => {
  it("completes when every requirement is met", () => {
    const result = evaluateCompletion(rules(), snapshot());
    expect(result.complete).toBe(true);
    expect(result.readinessPercent).toBe(100);
    expect(result.requirements.filter((r) => r.required && !r.met)).toHaveLength(0);
  });

  it("blocks completion on unfinished lessons and says how many are left", () => {
    const result = evaluateCompletion(rules(), snapshot({ lessonsCompleted: 14 }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "lessons").met).toBe(false);
    expect(requirement(result, "lessons").detail).toContain("14 of 20");
  });

  it("ignores lesson count when the rule does not require every lesson", () => {
    const result = evaluateCompletion(rules({ requireAllLessons: false }), snapshot({ lessonsCompleted: 3 }));
    expect(requirement(result, "lessons").required).toBe(false);
    expect(result.complete).toBe(true);
  });

  it("blocks completion below the attendance threshold", () => {
    const result = evaluateCompletion(rules(), snapshot({ attendancePercent: 60 }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "attendance").met).toBe(false);
  });

  it("does not punish a student when no attendance has been recorded", () => {
    const result = evaluateCompletion(rules(), snapshot({ attendancePercent: null }));
    expect(requirement(result, "attendance").met).toBe(true);
    expect(result.complete).toBe(true);
  });

  it("skips attendance entirely for self-paced courses", () => {
    const result = evaluateCompletion(rules({ minAttendancePercent: null }), snapshot({ attendancePercent: 10 }));
    expect(requirement(result, "attendance").required).toBe(false);
    expect(result.complete).toBe(true);
  });

  it("treats an unattempted quiz as not met", () => {
    const result = evaluateCompletion(rules(), snapshot({ quizPercents: [80, null] }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "quizzes").met).toBe(false);
  });

  it("blocks completion when the quiz average is below the minimum", () => {
    const result = evaluateCompletion(rules(), snapshot({ quizPercents: [40, 50] }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "quizzes").met).toBe(false);
  });

  it("requires every project to be approved", () => {
    const result = evaluateCompletion(rules(), snapshot({ projectsTotal: 2, projectsApproved: 1 }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "projects").detail).toContain("1 of 2");
  });

  it("holds the certificate back until fees are clear", () => {
    const result = evaluateCompletion(rules(), snapshot({ paymentClear: false }));
    expect(result.complete).toBe(false);
    expect(requirement(result, "payment").met).toBe(false);
  });

  it("lets a course with no fee requirement complete while unpaid", () => {
    const result = evaluateCompletion(rules({ requirePaymentClear: false }), snapshot({ paymentClear: false }));
    expect(result.complete).toBe(true);
  });

  it("reports partial readiness between 0 and 100", () => {
    const result = evaluateCompletion(rules(), snapshot({ lessonsCompleted: 10, attendancePercent: 50, quizPercents: [30], projectsApproved: 0, paymentClear: false }));
    expect(result.complete).toBe(false);
    expect(result.readinessPercent).toBeGreaterThanOrEqual(0);
    expect(result.readinessPercent).toBeLessThan(100);
  });

  it("completes an empty course rather than trapping the student", () => {
    const result = evaluateCompletion(rules(), snapshot({ lessonsTotal: 0, lessonsCompleted: 0, quizPercents: [], projectsTotal: 0, projectsApproved: 0 }));
    expect(result.complete).toBe(true);
  });

  it("explains every requirement, met or not", () => {
    const result = evaluateCompletion(rules(), snapshot({ lessonsCompleted: 1 }));
    for (const r of result.requirements) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.detail.length).toBeGreaterThan(0);
    }
  });
});
