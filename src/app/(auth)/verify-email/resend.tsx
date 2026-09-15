"use client";

import * as React from "react";
import { resendVerificationAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function ResendVerification() {
  const [pending, start] = React.useTransition();
  return (
    <Button
      variant="secondary"
      className="mt-2"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await resendVerificationAction();
          if (res.ok) toast.success("Verification email sent.");
          else toast.error(res.error.message);
        })
      }
    >
      Resend verification email
    </Button>
  );
}
