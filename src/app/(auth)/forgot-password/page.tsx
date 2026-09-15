import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return <ForgotPasswordForm labels={{ resetTitle: t("resetTitle"), resetSubtitle: t("resetSubtitle"), resetSend: t("resetSend"), resetSent: t("resetSent"), email: t("email"), signIn: t("signIn") }} />;
}
