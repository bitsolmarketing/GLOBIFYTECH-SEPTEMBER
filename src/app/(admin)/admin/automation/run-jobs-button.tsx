"use client";

import { Play } from "lucide-react";
import { runDailyJobsAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/confirm-action";

export function RunJobsButton() {
  return (
    <ActionButton action={runDailyJobsAction} successMessage="Daily jobs queued." variant="outline" size="sm">
      <Play /> Run daily jobs now
    </ActionButton>
  );
}
