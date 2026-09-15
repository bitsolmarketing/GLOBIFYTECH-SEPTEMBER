import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const t = await getTranslations("auth");
  const labels = { signUpTitle: t("signUpTitle"), signUpSubtitle: t("signUpSubtitle"), fullName: t("fullName"), email: t("email"), phone: t("phone"), password: t("password"), confirmPassword: t("confirmPassword"), passwordHint: t("passwordHint"), termsNotice: t("termsNotice"), signUp: t("signUp"), haveAccount: t("haveAccount"), signIn: t("signIn") };
  return <SignUpForm next={next} labels={labels} />;
}
