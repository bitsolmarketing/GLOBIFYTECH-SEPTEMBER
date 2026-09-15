"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, variant = "line", ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: "line" | "pill" }) {
  return (
    <TabsPrimitive.List
      data-variant={variant}
      className={cn(
        "group/tabs inline-flex items-center gap-1 text-fg-muted",
        variant === "line" ? "w-full border-b border-border" : "rounded-lg bg-bg-muted p-1",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 [&_svg]:size-4",
        "group-data-[variant=line]/tabs:-mb-px group-data-[variant=line]/tabs:border-b-2 group-data-[variant=line]/tabs:border-transparent group-data-[variant=line]/tabs:px-3 group-data-[variant=line]/tabs:py-2.5 group-data-[variant=line]/tabs:data-[state=active]:border-accent group-data-[variant=line]/tabs:data-[state=active]:text-fg group-data-[variant=line]/tabs:hover:text-fg",
        "group-data-[variant=pill]/tabs:rounded-md group-data-[variant=pill]/tabs:px-3 group-data-[variant=pill]/tabs:py-1.5 group-data-[variant=pill]/tabs:data-[state=active]:bg-surface group-data-[variant=pill]/tabs:data-[state=active]:text-fg group-data-[variant=pill]/tabs:data-[state=active]:shadow-xs",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4 outline-none", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
