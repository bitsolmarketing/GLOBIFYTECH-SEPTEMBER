import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStudentProfile } from "@/server/auth/session";
import { getExamAttempt } from "@/server/services/exams";
import { QuizPlayer } from "@/components/lms/quiz-player";
import { toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Exam" };
export const dynamic = "force-dynamic";

export default async function ExamAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { studentId }] = await Promise.all([params, requireStudentProfile()]);
  const data = await getExamAttempt(id, studentId).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!data) notFound();
  const { attempt, questions } = data;
  const finished = attempt.status !== "IN_PROGRESS";
  return (
    <QuizPlayer
      mode="exam"
      attemptId={attempt.id}
      title={attempt.exam.title}
      questions={questions}
      expiresAt={attempt.expiresAt?.toISOString() ?? null}
      status={attempt.status}
      passingScore={attempt.exam.passingScore}
      backHref="/student/exams"
      result={finished ? { percent: toNumber(attempt.percent), passed: attempt.passed, score: toNumber(attempt.score), maxScore: toNumber(attempt.maxScore), weakTopics: [], needsManualGrading: attempt.status === "SUBMITTED", answers: {} } : null}
    />
  );
}
