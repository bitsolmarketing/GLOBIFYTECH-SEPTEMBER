"use client";

import * as React from "react";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { captureLeadAction } from "@/server/actions/leads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Alert } from "@/components/ui/alert";
import { SimpleSelect } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function LeadForm({ courseId, courseTitle, compact, className, source = "WEBSITE" }: { courseId?: string | null; courseTitle?: string; compact?: boolean; className?: string; source?: string }) {
  const [state, action, pending] = useActionState(captureLeadAction, null);
  const [mode, setMode] = React.useState<string>("");
  const errors = state && !state.ok ? state.error.fields : undefined;
  const utm = React.useMemo(() => {
    if (typeof window === "undefined") return {};
    const p = new URLSearchParams(window.location.search);
    return { utm_source: p.get("utm_source") ?? "", utm_medium: p.get("utm_medium") ?? "", utm_campaign: p.get("utm_campaign") ?? "" };
  }, []);

  if (state?.ok) {
    return (
      <div className={cn("surface flex flex-col items-center gap-3 p-8 text-center", className)}>
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-h4">Thanks — a counsellor will reach out shortly.</p>
        <p className="text-body-sm text-fg-muted">Usually within a few hours on WhatsApp, Monday to Saturday, 9 AM – 9 PM.</p>
      </div>
    );
  }

  return (
    <form action={action} className={cn("flex flex-col gap-4", className)} noValidate>
      <input type="hidden" name="courseId" value={courseId ?? ""} />
      <input type="hidden" name="interest" value={courseTitle ?? ""} />
      <input type="hidden" name="source" value={source} />
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state && !state.ok && !errors ? <Alert variant="danger">{state.error.message}</Alert> : null}
      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field label="Full name" htmlFor="lead-name" error={errors?.name} required>
          <Input id="lead-name" name="name" autoComplete="name" required invalid={!!errors?.name} />
        </Field>
        <Field label="WhatsApp / phone" htmlFor="lead-phone" error={errors?.phone} required>
          <Input id="lead-phone" name="phone" type="tel" autoComplete="tel" placeholder="03xx xxxxxxx" required invalid={!!errors?.phone} />
        </Field>
        <Field label="Email" htmlFor="lead-email" error={errors?.email}>
          <Input id="lead-email" name="email" type="email" autoComplete="email" invalid={!!errors?.email} />
        </Field>
        <Field label="City" htmlFor="lead-city" error={errors?.city}>
          <Input id="lead-city" name="city" autoComplete="address-level2" />
        </Field>
      </div>
      <Field label="Preferred learning mode" htmlFor="lead-mode">
        <input type="hidden" name="preferredMode" value={mode} />
        <SimpleSelect value={mode} onValueChange={setMode} placeholder="Choose one" options={[{ value: "ON_CAMPUS", label: "On campus (Faisalabad)" }, { value: "LIVE_ONLINE", label: "Live online" }, { value: "HYBRID", label: "Hybrid" }, { value: "SELF_PACED", label: "Self-paced" }]} />
      </Field>
      {!compact ? (
        <Field label="Anything we should know?" htmlFor="lead-message" error={errors?.message}>
          <Textarea id="lead-message" name="message" rows={3} placeholder="Your goals, background, or questions" />
        </Field>
      ) : null}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        Talk to admissions
      </Button>
      <p className="text-center text-caption text-fg-subtle">No spam. A real counsellor replies on WhatsApp.</p>
    </form>
  );
}
