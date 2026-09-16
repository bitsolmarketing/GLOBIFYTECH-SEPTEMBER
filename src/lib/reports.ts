import type { ReportKey } from "@/server/services/analytics";

export const REPORTS: Array<{ key: ReportKey; label: string; description: string }> = [
  { key: "students", label: "Students", description: "Every student with contact details, campus and enrollment count." },
  { key: "enrollments", label: "Enrollments", description: "Enrollments with course, batch, status and progress." },
  { key: "payments", label: "Payments", description: "Successful and pending payments with provider and receipt numbers." },
  { key: "leads", label: "Leads", description: "CRM leads with stage, source, counsellor and follow-up dates." },
  { key: "attendance", label: "Attendance", description: "Attendance records per session with method and status." },
  { key: "certificates", label: "Certificates", description: "Issued certificates with verification codes and status." },
  { key: "quiz-performance", label: "Quiz performance", description: "Graded quiz attempts with scores and pass/fail." },
];

export const REPORT_FORMATS = ["csv", "xlsx", "pdf"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];
