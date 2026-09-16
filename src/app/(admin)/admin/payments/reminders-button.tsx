"use client";

import { Bell } from "lucide-react";
import { runPaymentRemindersAction } from "@/server/actions/admin";
import { ActionButton } from "@/components/admin/confirm-action";

export function RunRemindersButton() {
  return (
    <ActionButton action={runPaymentRemindersAction} successMessage="Reminders sent and overdue invoices flagged." variant="outline" size="sm">
      <Bell /> Send reminders
    </ActionButton>
  );
}
