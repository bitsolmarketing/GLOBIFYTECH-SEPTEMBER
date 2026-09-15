"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Lock, SearchX, WifiOff, CreditCard, UploadCloud, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export type ErrorKind = "not-found" | "forbidden" | "server" | "network" | "unauthorized" | "session-expired" | "payment-failed" | "upload-failed";

const presets: Record<ErrorKind, { icon: React.ReactNode; title: string; body: string }> = {
  "not-found": { icon: <SearchX />, title: "We couldn't find that page.", body: "The link may be outdated, or the page may have moved." },
  forbidden: { icon: <Lock />, title: "You don't have access to this space.", body: "If you think this is a mistake, contact your administrator." },
  server: { icon: <AlertTriangle />, title: "We couldn't load your learning space.", body: "Something went wrong on our side. Please try again in a moment." },
  network: { icon: <WifiOff />, title: "You're offline.", body: "Check your connection and try again." },
  unauthorized: { icon: <Lock />, title: "Please sign in to continue.", body: "Your learning space is waiting for you." },
  "session-expired": { icon: <Clock />, title: "Your session expired.", body: "Sign in again to pick up where you left off." },
  "payment-failed": { icon: <CreditCard />, title: "We couldn't process your payment.", body: "No money was taken. Please try another method or contact finance." },
  "upload-failed": { icon: <UploadCloud />, title: "We couldn't upload that file.", body: "Check the file type and size, then try again." },
};

export interface ErrorStateProps {
  kind?: ErrorKind;
  title?: string;
  description?: string;
  onRetry?: () => void;
  homeHref?: string;
  className?: string;
  full?: boolean;
}

function ErrorState({ kind = "server", title, description, onRetry, homeHref = "/", className, full }: ErrorStateProps) {
  const preset = presets[kind];
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 text-center", full ? "min-h-[60vh] px-6" : "px-6 py-14", className)}>
      <div className="flex size-14 items-center justify-center rounded-2xl bg-bg-muted text-fg-muted [&_svg]:size-6">{preset.icon}</div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-h3 text-fg">{title ?? preset.title}</h2>
        <p className="text-body text-fg-muted">{description ?? preset.body}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry}>Try again</Button>
        ) : kind === "unauthorized" || kind === "session-expired" ? (
          <Button asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        ) : null}
        <Button variant="secondary" asChild>
          <Link href={homeHref}>Go to homepage</Link>
        </Button>
      </div>
    </div>
  );
}

export { ErrorState };
