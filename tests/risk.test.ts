import { describe, expect, it } from "vitest";
import { scoreRisk, DEFAULT_RISK_THRESHOLDS, type RiskSignals } from "@/lib/risk";

const healthy = (over: Partial<RiskSignals> = {}): RiskSignals => ({
  daysInactive: 0,
  attendancePercent: 95,
  missedAssignments: 0,
  totalAssignmentsDue: 4,
  avgQuizPercent: 85,
  quizzesFailed: 0,
  progressPercent: 70,
  expectedProgressPercent: 65,
  learningMinutesLast7Days: 300,
  overdueInvoices: 0,
  ...over,
});

describe("student success risk engine", () => {
  it("scores an engaged student as low risk", () => {
    const r = scoreRisk(healthy());
    expect(r.level).toBe("LOW");
    expect(r.score).toBeLessThan(35);
    expect(r.recommendation.length).toBeGreaterThan(0);
  });

  it("keeps every score inside 0 to 100", () => {
    const worst = scoreRisk(healthy({ daysInactive: 400, attendancePercent: 0, missedAssignments: 50, totalAssignmentsDue: 50, avgQuizPercent: 0, quizzesFailed: 20, progressPercent: 0, expectedProgressPercent: 100, learningMinutesLast7Days: 0, overdueInvoices: 9 }));
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
    expect(worst.level).toBe("HIGH");
  });

  it("raises risk as inactivity grows", () => {
    const quiet = scoreRisk(healthy({ daysInactive: DEFAULT_RISK_THRESHOLDS.inactiveDaysMedium + 1 })).score;
    const gone = scoreRisk(healthy({ daysInactive: DEFAULT_RISK_THRESHOLDS.inactiveDaysHigh + 5 })).score;
    expect(gone).toBeGreaterThan(quiet);
    expect(quiet).toBeGreaterThan(scoreRisk(healthy()).score);
  });

  it("flags poor attendance in its reasons", () => {
    const r = scoreRisk(healthy({ attendancePercent: 40 }));
    expect(r.score).toBeGreaterThan(scoreRisk(healthy()).score);
    expect(r.reasons.join(" ").toLowerCase()).toContain("attendance");
  });

  it("does not penalise a student with no attendance data", () => {
    expect(scoreRisk(healthy({ attendancePercent: null })).score).toBe(scoreRisk(healthy()).score);
  });

  it("weighs missed assignments against the number that were due", () => {
    const some = scoreRisk(healthy({ missedAssignments: 1, totalAssignmentsDue: 10 })).score;
    const most = scoreRisk(healthy({ missedAssignments: 8, totalAssignmentsDue: 10 })).score;
    expect(most).toBeGreaterThan(some);
  });

  it("notices a student falling behind the batch", () => {
    const behind = scoreRisk(healthy({ progressPercent: 20, expectedProgressPercent: 80 }));
    expect(behind.score).toBeGreaterThan(scoreRisk(healthy()).score);
    expect(behind.reasons.length).toBeGreaterThan(0);
  });

  it("does not compare progress for self-paced students", () => {
    const selfPaced = scoreRisk(healthy({ progressPercent: 10, expectedProgressPercent: null }));
    const paced = scoreRisk(healthy({ progressPercent: 10, expectedProgressPercent: 80 }));
    expect(selfPaced.score).toBeLessThan(paced.score);
  });

  it("counts overdue invoices as a risk signal", () => {
    const r = scoreRisk(healthy({ overdueInvoices: 2 }));
    expect(r.score).toBeGreaterThan(scoreRisk(healthy()).score);
  });

  it("escalates from low to medium to high as signals stack up", () => {
    const low = scoreRisk(healthy());
    const medium = scoreRisk(healthy({ daysInactive: 7, attendancePercent: 70, avgQuizPercent: 55 }));
    const high = scoreRisk(healthy({ daysInactive: 21, attendancePercent: 35, avgQuizPercent: 25, quizzesFailed: 3, missedAssignments: 4, learningMinutesLast7Days: 0, overdueInvoices: 2 }));
    expect(low.score).toBeLessThan(medium.score);
    expect(medium.score).toBeLessThan(high.score);
    expect(high.level).toBe("HIGH");
  });

  it("always explains itself with reasons and a recommendation", () => {
    const r = scoreRisk(healthy({ daysInactive: 14, attendancePercent: 50 }));
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.recommendation.trim().length).toBeGreaterThan(10);
  });

  it("is deterministic for the same input", () => {
    const signals = healthy({ daysInactive: 9, attendancePercent: 62, quizzesFailed: 1 });
    expect(scoreRisk(signals)).toEqual(scoreRisk(signals));
  });

  it("honours custom thresholds from settings", () => {
    const signals = healthy({ daysInactive: 6 });
    const strict = scoreRisk(signals, { ...DEFAULT_RISK_THRESHOLDS, inactiveDaysMedium: 2, inactiveDaysHigh: 4 });
    const lenient = scoreRisk(signals, { ...DEFAULT_RISK_THRESHOLDS, inactiveDaysMedium: 20, inactiveDaysHigh: 40 });
    expect(strict.score).toBeGreaterThan(lenient.score);
  });
});
