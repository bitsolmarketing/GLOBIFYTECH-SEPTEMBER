import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next } = await searchParams;
  const t = await getTranslations("auth");
  const labels = { signInTitle: t("signInTitle"), signInSubtitle: t("signInSubtitle"), email: t("email"), password: t("password"), rememberMe: t("rememberMe"), forgotPassword: t("forgotPassword"), signIn: t("signIn"), noAccount: t("noAccount"), signUp: t("signUp") };
  return <SignInForm next={next} labels={labels} />;
}
