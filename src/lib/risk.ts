/**
 * AI Student Success Engine — deterministic risk scoring (pure).
 * The LLM layer explains and recommends; this function decides the score so
 * results are reproducible, explainable and testable.
 */
export interface RiskSignals {
  daysInactive: number;
  attendancePercent: number | null;
  missedAssignments: number;
  totalAssignmentsDue: number;
  avgQuizPercent: number | null;
  quizzesFailed: number;
  progressPercent: number;
  /** expected progress at this point of the batch (0–100), null for self-paced */
  expectedProgressPercent: number | null;
  learningMinutesLast7Days: number;
  overdueInvoices: number;
}

export interface RiskThresholds {
  inactiveDaysMedium: number;
  inactiveDaysHigh: number;
  attendanceWarning: number;
  attendanceCritical: number;
}

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  inactiveDaysMedium: 5,
  inactiveDaysHigh: 10,
  attendanceWarning: 75,
  attendanceCritical: 60,
};

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskResult {
  score: number; // 0–100
  level: RiskLevel;
  reasons: string[];
  recommendation: string;
}

export function scoreRisk(s: RiskSignals, t: RiskThresholds = DEFAULT_RISK_THRESHOLDS): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  // Inactivity (up to 30)
  if (s.daysInactive >= t.inactiveDaysHigh) {
    score += 30;
    reasons.push(`${s.daysInactive} days inactive`);
  } else if (s.daysInactive >= t.inactiveDaysMedium) {
    score += 15;
    reasons.push(`${s.daysInactive} days inactive`);
  }

  // Attendance (up to 25)
  if (s.attendancePercent != null) {
    if (s.attendancePercent < t.attendanceCritical) {
      score += 25;
      reasons.push(`Attendance at ${Math.round(s.attendancePercent)}%`);
    } else if (s.attendancePercent < t.attendanceWarning) {
      score += 12;
      reasons.push(`Attendance at ${Math.round(s.attendancePercent)}%`);
    }
  }

  // Assignments (up to 20)
  if (s.missedAssignments >= 2) {
    score += 20;
    reasons.push(`${s.missedAssignments} missed assignments`);
  } else if (s.missedAssignments === 1) {
    score += 8;
    reasons.push("1 missed assignment");
  }

  // Quiz performance (up to 15)
  if (s.avgQuizPercent != null && s.avgQuizPercent < 50) {
    score += 15;
    reasons.push(`Low quiz average (${Math.round(s.avgQuizPercent)}%)`);
  } else if (s.quizzesFailed >= 2) {
    score += 8;
    reasons.push(`${s.quizzesFailed} failed quizzes`);
  }

  // Progress lag (up to 15)
  if (s.expectedProgressPercent != null) {
    const lag = s.expectedProgressPercent - s.progressPercent;
    if (lag >= 30) {
      score += 15;
      reasons.push(`${Math.round(lag)} points behind schedule`);
    } else if (lag >= 15) {
      score += 7;
      reasons.push(`${Math.round(lag)} points behind schedule`);
    }
  }

  // Low engagement this week (up to 5)
  if (s.learningMinutesLast7Days < 30 && s.daysInactive < t.inactiveDaysMedium) {
    score += 5;
    reasons.push("Under 30 minutes of learning this week");
  }

  // Finance (up to 5) — a signal, not a cause
  if (s.overdueInvoices > 0) {
    score += 5;
    reasons.push(`${s.overdueInvoices} overdue invoice${s.overdueInvoices > 1 ? "s" : ""}`);
  }

  score = Math.min(100, score);
  const level: RiskLevel = score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW";
  const recommendation =
    level === "HIGH"
      ? "Counsellor follow-up within 24 hours; instructor check-in on missed work."
      : level === "MEDIUM"
        ? "Send a personal nudge and offer a catch-up plan for the next lesson."
        : "On track. Celebrate progress in the next class.";
  return { score, level, reasons, recommendation };
}
