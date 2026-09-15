"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { contactAction } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export function ContactForm() {
  const [state, action, pending] = useActionState(contactAction, null);
  const errors = state && !state.ok ? state.error.fields : undefined;
  if (state?.ok) {
    return (
      <div className="surface flex flex-col items-center gap-3 p-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-h4">Message received.</p>
        <p className="text-body-sm text-fg-muted">We reply within one working day, usually much faster on WhatsApp.</p>
      </div>
    );
  }
  return (
    <form action={action} className="surface flex flex-col gap-4 p-6 md:p-8" noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="c-name" error={errors?.name} required>
          <Input id="c-name" name="name" autoComplete="name" required />
        </Field>
        <Field label="Email" htmlFor="c-email" error={errors?.email} required>
          <Input id="c-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Phone / WhatsApp" htmlFor="c-phone" error={errors?.phone}>
          <Input id="c-phone" name="phone" type="tel" autoComplete="tel" />
        </Field>
        <Field label="Subject" htmlFor="c-subject" error={errors?.subject} required>
          <Input id="c-subject" name="subject" required />
        </Field>
      </div>
      <Field label="Message" htmlFor="c-message" error={errors?.message} required>
        <Textarea id="c-message" name="message" rows={5} required />
      </Field>
      <Button type="submit" size="lg" loading={pending}>
        Send message
      </Button>
    </form>
  );
}
