"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateApplicantStatusAction } from "@/server/actions/employer";
import { SimpleSelect } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { enumLabel } from "@/lib/utils";

const STATUSES = ["APPLIED", "SHORTLISTED", "INTERVIEW", "OFFERED", "HIRED", "REJECTED"] as const;

export function ApplicantStatus({ applicationId, status }: { applicationId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  if (status === "WITHDRAWN") return <span className="text-caption text-fg-subtle">Withdrawn</span>;
  return (
    <SimpleSelect
      size="sm"
      className="w-36"
      value={status}
      disabled={pending}
      onValueChange={(v) =>
        start(async () => {
          const res = await updateApplicantStatusAction({ applicationId, status: v as "APPLIED" });
          if (!res.ok) { toast.error(res.error.message); return; }
          toast.success(`Moved to ${enumLabel(v).toLowerCase()}. The candidate has been notified.`);
          router.refresh();
        })
      }
      options={STATUSES.map((s) => ({ value: s, label: enumLabel(s) }))}
    />
  );
}
