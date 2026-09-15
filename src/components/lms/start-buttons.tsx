"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { startQuizAction, startExamAction } from "@/server/actions/student";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function StartQuizButton({ quizId, label = "Start quiz", autoStart, ...props }: { quizId: string; label?: string; autoStart?: boolean } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const go = React.useCallback(
    () =>
      start(async () => {
        const res = await startQuizAction(quizId);
        if (!res.ok) { toast.error(res.error.message); return; }
        router.push(`/student/quizzes/attempt/${res.data.attemptId}`);
      }),
    [quizId, router],
  );
  React.useEffect(() => {
    if (autoStart) go();
  }, [autoStart, go]);
  return (
    <Button onClick={go} loading={pending} {...props}>
      <Play /> {label}
    </Button>
  );
}

export function StartExamButton({ examId, label = "Start exam", ...props }: { examId: string; label?: string } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      onClick={() =>
        start(async () => {
          if (!window.confirm("Once you start, the timer runs even if you close the page. Ready?")) return;
          const res = await startExamAction(examId);
          if (!res.ok) { toast.error(res.error.message); return; }
          router.push(`/student/exams/attempt/${res.data.attemptId}`);
        })
      }
      loading={pending}
      {...props}
    >
      <Play /> {label}
    </Button>
  );
}
