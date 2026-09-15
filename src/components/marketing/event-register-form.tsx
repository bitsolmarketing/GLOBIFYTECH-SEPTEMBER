"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { registerEventAction } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";

export function EventRegisterForm({ eventId, defaults }: { eventId: string; defaults?: { name?: string; email?: string } }) {
  const [state, action, pending] = useActionState(registerEventAction, null);
  const errors = state && !state.ok ? state.error.fields : undefined;
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="font-medium">You're registered.</p>
        <p className="text-body-sm text-fg-muted">We've saved your seat. See you there.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="eventId" value={eventId} />
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <Field label="Full name" htmlFor="ev-name" error={errors?.name} required>
        <Input id="ev-name" name="name" defaultValue={defaults?.name} required />
      </Field>
      <Field label="Email" htmlFor="ev-email" error={errors?.email} required>
        <Input id="ev-email" name="email" type="email" defaultValue={defaults?.email} required />
      </Field>
      <Field label="Phone / WhatsApp" htmlFor="ev-phone" error={errors?.phone}>
        <Input id="ev-phone" name="phone" type="tel" />
      </Field>
      <Button type="submit" loading={pending} size="lg">
        Reserve my seat
      </Button>
    </form>
  );
}
