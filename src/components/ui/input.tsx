import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  invalid?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

function Input({ className, type = "text", invalid, leading, trailing, ...props }: InputProps) {
  const field = (
    <input
      type={type}
      data-slot="input"
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-sm text-fg shadow-xs transition-[border-color,box-shadow] duration-200 placeholder:text-fg-subtle",
        "hover:border-border-strong focus:border-accent focus:outline-none focus:ring-3 focus:ring-ring/30",
        "disabled:cursor-not-allowed disabled:opacity-60 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "aria-invalid:border-danger aria-invalid:focus:ring-danger/25",
        leading && "ps-9",
        trailing && "pe-9",
        className,
      )}
      {...props}
    />
  );
  if (!leading && !trailing) return field;
  return (
    <div className="relative">
      {leading ? (
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-fg-subtle [&_svg]:size-4">
          {leading}
        </span>
      ) : null}
      {field}
      {trailing ? (
        <span className="absolute inset-y-0 end-3 flex items-center text-fg-subtle [&_svg]:size-4">{trailing}</span>
      ) : null}
    </div>
  );
}

export { Input };
