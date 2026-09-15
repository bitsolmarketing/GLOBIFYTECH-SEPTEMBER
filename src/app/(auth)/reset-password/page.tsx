import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = await getTranslations("auth");
  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h2">This link is missing its token.</h1>
        <p className="text-body-sm text-fg-muted">Request a fresh reset link and open it from the same device.</p>
        <Button asChild>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }
  return <ResetPasswordForm token={token} labels={{ newPasswordTitle: t("newPasswordTitle"), newPasswordSubmit: t("newPasswordSubmit"), password: t("password"), confirmPassword: t("confirmPassword"), passwordHint: t("passwordHint"), signIn: t("signIn") }} />;
}
