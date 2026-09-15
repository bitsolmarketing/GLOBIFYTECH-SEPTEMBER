import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireStudentProfile } from "@/server/auth/session";
import { getAttemptForStudent } from "@/server/services/quizzes";
import { QuizPlayer } from "@/components/lms/quiz-player";
import { toNumber } from "@/lib/utils";
import { AppError } from "@/server/errors";

export const metadata: Metadata = { title: "Quiz" };
export const dynamic = "force-dynamic";

export default async function QuizAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { studentId }] = await Promise.all([params, requireStudentProfile()]);
  const data = await getAttemptForStudent(id, studentId).catch((e) => (e instanceof AppError ? null : Promise.reject(e)));
  if (!data) notFound();
  const { attempt, questions } = data;
  const finished = attempt.status !== "IN_PROGRESS";
  return (
    <QuizPlayer
      mode="quiz"
      attemptId={attempt.id}
      title={attempt.quiz.title}
      questions={questions}
      expiresAt={attempt.expiresAt?.toISOString() ?? null}
      status={attempt.status}
      passingScore={attempt.quiz.passingScore}
      backHref="/student/quizzes"
      result={
        finished
          ? {
              percent: toNumber(attempt.percent),
              passed: attempt.passed,
              score: toNumber(attempt.score),
              maxScore: toNumber(attempt.maxScore),
              weakTopics: attempt.weakTopics,
              needsManualGrading: attempt.status === "SUBMITTED",
              courseId: attempt.quiz.courseId,
              answers: Object.fromEntries(attempt.answers.map((a) => [a.questionId, { selectedOptionIds: a.selectedOptionIds, textAnswer: a.textAnswer, structured: a.structured, isCorrect: a.isCorrect }])),
            }
          : null
      }
    />
  );
}
