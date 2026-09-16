import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-out select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-fg hover:bg-accent-hover shadow-xs",
        secondary: "bg-surface text-fg border border-border hover:border-border-strong hover:bg-bg-subtle shadow-xs",
        ghost: "text-fg-muted hover:text-fg hover:bg-bg-muted",
        outline: "border border-border-strong text-fg hover:bg-bg-subtle",
        danger: "bg-danger text-white hover:opacity-90 shadow-xs",
        link: "text-accent underline-offset-4 hover:underline px-0 h-auto",
        inverse: "bg-fg text-fg-inverse hover:opacity-90",
        gradient: "gradient-brand text-white shadow-glow hover:opacity-95",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-md",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-[15px] rounded-lg",
        xl: "h-14 px-8 text-base rounded-lg",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

function Button({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }: ButtonProps) {
  // Slot forwards props onto the single child it is given, so it must receive
  // exactly one element: no spinner, and no `disabled` (invalid on an anchor).
  if (asChild) {
    return (
      <Slot.Root data-slot="button" className={cn(buttonVariants({ variant, size, className }))} aria-disabled={disabled || undefined} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "size"> {
  label: string;
  size?: "md" | "sm";
}

function IconButton({ label, size = "md", variant = "ghost", className, ...props }: IconButtonProps) {
  return (
    <Button
      aria-label={label}
      title={label}
      variant={variant}
      size={size === "sm" ? "icon-sm" : "icon"}
      className={cn("rounded-md", className)}
      {...props}
    />
  );
}

export { Button, IconButton, buttonVariants };
