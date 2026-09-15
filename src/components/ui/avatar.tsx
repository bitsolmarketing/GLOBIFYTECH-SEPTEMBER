"use client";

import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
};

export interface AvatarProps extends React.ComponentProps<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
}

function Avatar({ className, src, name, size = "md", ...props }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn("relative flex shrink-0 overflow-hidden rounded-full bg-bg-muted", sizes[size], className)}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name ?? ""} className="aspect-square size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 300 : 0}
        className="flex size-full items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

function AvatarGroup({ people, max = 4, size = "sm" }: { people: Array<{ name: string | null; src?: string | null }>; max?: number; size?: keyof typeof sizes }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} className="ring-2 ring-surface" />
      ))}
      {rest > 0 ? (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-bg-muted font-medium text-fg-muted ring-2 ring-surface",
            sizes[size],
          )}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

export { Avatar, AvatarGroup };
