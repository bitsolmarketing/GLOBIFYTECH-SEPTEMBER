import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative flex w-full gap-3 rounded-lg border p-4 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", {
  variants: {
    variant: {
      info: "border-info/20 bg-info-soft text-fg [&_svg]:text-info",
      success: "border-success/20 bg-success-soft text-fg [&_svg]:text-success",
      warning: "border-warning/20 bg-warning-soft text-fg [&_svg]:text-warning",
      danger: "border-danger/20 bg-danger-soft text-fg [&_svg]:text-danger",
      neutral: "border-border bg-bg-subtle text-fg [&_svg]:text-fg-muted",
    },
  },
  defaultVariants: { variant: "info" },
});

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: AlertCircle, neutral: Info };

export interface AlertProps extends React.ComponentProps<"div">, VariantProps<typeof alertVariants> {
  title?: string;
  icon?: React.ReactNode | false;
}

function Alert({ className, variant = "info", title, icon, children, ...props }: AlertProps) {
  const Icon = icons[variant ?? "info"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon === false ? null : (icon ?? <Icon />)}
      <div className="flex flex-col gap-1">
        {title ? <p className="font-medium leading-tight">{title}</p> : null}
        {children ? <div className="text-body-sm text-fg-muted">{children}</div> : null}
      </div>
    </div>
  );
}

export { Alert };
