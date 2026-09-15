"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side breadcrumb only; the server already logged the stack.
    console.error("route error", error.digest ?? error.message);
  }, [error]);
  return <ErrorState kind="server" onRetry={reset} full />;
}
