"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4.5 shrink-0 rounded-full border border-border-strong bg-surface shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-accent aria-invalid:border-danger",
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <span className="size-2.5 rounded-full bg-accent" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

/** Card-style radio option used in forms (learning mode, payment method…). */
function RadioCard({
  value,
  title,
  description,
  icon,
  className,
}: {
  value: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong has-[[data-state=checked]]:border-accent has-[[data-state=checked]]:bg-accent-soft/40",
        className,
      )}
    >
      <RadioGroupItem value={value} id={id} className="mt-0.5" />
      {icon ? <span className="text-fg-muted [&_svg]:size-5">{icon}</span> : null}
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-fg">{title}</span>
        {description ? <span className="text-body-sm text-fg-muted">{description}</span> : null}
      </span>
    </label>
  );
}

export { RadioGroup, RadioGroupItem, RadioCard };
