"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from "lucide-react";

function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: "!bg-surface-raised !text-fg !border !border-border !shadow-lg !rounded-lg",
          description: "!text-fg-muted",
          actionButton: "!bg-accent !text-white",
          cancelButton: "!bg-bg-muted !text-fg",
        },
      }}
      icons={{
        success: <CheckCircle2 className="size-4 text-success" />,
        error: <AlertCircle className="size-4 text-danger" />,
        info: <Info className="size-4 text-info" />,
        warning: <AlertTriangle className="size-4 text-warning" />,
        loading: <Loader2 className="size-4 animate-spin" />,
      }}
    />
  );
}

export { Toaster, toast };
