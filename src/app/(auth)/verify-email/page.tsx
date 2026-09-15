import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailCheck, AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { verifyEmailAction } from "@/server/actions/auth";
import { getSession } from "@/server/auth/session";
import { Button } from "@/components/ui/button";
import { ResendVerification } from "./resend";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const [t, session] = await Promise.all([getTranslations("auth"), getSession()]);

  if (token) {
    const result = await verifyEmailAction(token);
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        {result.ok ? <CheckCircle2 className="size-10 text-success" /> : <AlertCircle className="size-10 text-danger" />}
        <h1 className="text-h3">{result.ok ? t("verified") : result.error.message}</h1>
        <Button asChild className="mt-2">
          <Link href={session ? "/student/dashboard" : "/sign-in"}>{session ? "Go to my dashboard" : t("signIn")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <MailCheck className="size-10 text-accent" />
      <h1 className="text-h3">{t("verifyTitle")}</h1>
      <p className="text-body-sm text-fg-muted">{t("verifySubtitle", { email: session?.email ?? "your email address" })}</p>
      {session ? <ResendVerification /> : null}
    </div>
  );
}
