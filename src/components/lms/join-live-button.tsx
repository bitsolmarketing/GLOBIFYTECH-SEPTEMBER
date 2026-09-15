"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { joinLiveClassAction } from "@/server/actions/student";
import { Button, type ButtonProps } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

export function JoinLiveButton({ liveClassId, label = "Join class", ...props }: { liveClassId: string; label?: string } & Omit<ButtonProps, "onClick">) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      onClick={() =>
        start(async () => {
          const res = await joinLiveClassAction(liveClassId);
          if (!res.ok) { toast.error(res.error.message); return; }
          window.open(res.data.url, "_blank", "noopener");
        })
      }
      loading={pending}
      {...props}
    >
      <Video /> {label}
    </Button>
  );
}
