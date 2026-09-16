"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { signInAction, signUpAction, requestPasswordResetAction, resetPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = React.useState(false);
  return (
    <Input
      {...props}
      type={show ? "text" : "password"}
      trailing={
        <button type="button" onClick={() => setShow((s) => !s)} className="pointer-events-auto rounded p-0.5 text-fg-subtle hover:text-fg" aria-label={show ? "Hide password" : "Show password"}>
          {show ? <EyeOff /> : <Eye />}
        </button>
      }
    />
  );
}

export function SignInForm({ next, labels }: { next?: string; labels: Record<string, string> }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(signInAction, null);
  React.useEffect(() => {
    if (state?.ok) {
      router.replace(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);
  const errors = state && !state.ok ? state.error.fields : undefined;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">{labels.signInTitle}</h1>
        <p className="text-body-sm text-fg-muted">{labels.signInSubtitle}</p>
      </div>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label={labels.email} htmlFor="email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!errors?.email} />
      </Field>
      <Field label={labels.password} htmlFor="password" error={errors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required invalid={!!errors?.password} />
      </Field>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-body-sm text-fg-muted">
          <Checkbox name="remember" defaultChecked /> {labels.rememberMe}
        </label>
        <Link href="/forgot-password" className="text-body-sm text-accent hover:underline">
          {labels.forgotPassword}
        </Link>
      </div>
      <Button type="submit" size="lg" loading={pending || !!state?.ok}>
        {labels.signIn}
      </Button>
      <p className="text-center text-body-sm text-fg-muted">
        {labels.noAccount}{" "}
        <Link href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">
          {labels.signUp}
        </Link>
      </p>
    </form>
  );
}

export function SignUpForm({ next, labels }: { next?: string; labels: Record<string, string> }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(signUpAction, null);
  React.useEffect(() => {
    if (state?.ok) {
      router.replace(next && next.startsWith("/") ? next : state.data.redirectTo);
      router.refresh();
    }
  }, [state, router, next]);
  const errors = state && !state.ok ? state.error.fields : undefined;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">{labels.signUpTitle}</h1>
        <p className="text-body-sm text-fg-muted">{labels.signUpSubtitle}</p>
      </div>
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label={labels.fullName} htmlFor="name" error={errors?.name}>
        <Input id="name" name="name" autoComplete="name" required invalid={!!errors?.name} />
      </Field>
      <Field label={labels.email} htmlFor="email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!errors?.email} />
      </Field>
      <Field label={labels.phone} htmlFor="phone" error={errors?.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="03xx xxxxxxx" invalid={!!errors?.phone} />
      </Field>
      <Field label={labels.password} htmlFor="password" error={errors?.password} hint={labels.passwordHint}>
        <PasswordInput id="password" name="password" autoComplete="new-password" required invalid={!!errors?.password} />
      </Field>
      <Field label={labels.confirmPassword} htmlFor="confirmPassword" error={errors?.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required invalid={!!errors?.confirmPassword} />
      </Field>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2 text-body-sm text-fg-muted">
          <Checkbox name="acceptTerms" className="mt-0.5" /> <span>{labels.termsNotice}</span>
        </label>
        {errors?.acceptTerms ? <p className="text-body-sm text-danger">{errors.acceptTerms[0]}</p> : null}
      </div>
      <Button type="submit" size="lg" loading={pending || !!state?.ok}>
        {labels.signUp}
      </Button>
      <p className="text-center text-body-sm text-fg-muted">
        {labels.haveAccount}{" "}
        <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-accent hover:underline">
          {labels.signIn}
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm({ labels }: { labels: Record<string, string> }) {
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);
  const errors = state && !state.ok ? state.error.fields : undefined;
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-h3">{labels.resetTitle}</h1>
        <p className="text-body-sm text-fg-muted">{labels.resetSent}</p>
        <Button asChild variant="secondary" className="mt-2">
          <Link href="/sign-in">{labels.signIn}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">{labels.resetTitle}</h1>
        <p className="text-body-sm text-fg-muted">{labels.resetSubtitle}</p>
      </div>
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label={labels.email} htmlFor="email" error={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required invalid={!!errors?.email} />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {labels.resetSend}
      </Button>
      <Link href="/sign-in" className="text-center text-body-sm text-accent hover:underline">
        {labels.signIn}
      </Link>
    </form>
  );
}

export function ResetPasswordForm({ token, labels }: { token: string; labels: Record<string, string> }) {
  const [state, action, pending] = useActionState(resetPasswordAction, null);
  const errors = state && !state.ok ? state.error.fields : undefined;
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2 className="size-10 text-success" />
        <h1 className="text-h3">Password updated.</h1>
        <p className="text-body-sm text-fg-muted">You can sign in with your new password now.</p>
        <Button asChild className="mt-2">
          <Link href="/sign-in">{labels.signIn}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1">
        <h1 className="text-h2">{labels.newPasswordTitle}</h1>
        <p className="text-body-sm text-fg-muted">{labels.passwordHint}</p>
      </div>
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label={labels.password} htmlFor="password" error={errors?.password}>
        <PasswordInput id="password" name="password" autoComplete="new-password" required invalid={!!errors?.password} />
      </Field>
      <Field label={labels.confirmPassword} htmlFor="confirmPassword" error={errors?.confirmPassword}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required invalid={!!errors?.confirmPassword} />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        {labels.newPasswordSubmit}
      </Button>
    </form>
  );
}
