"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HeroScene = dynamic(() => import("../hero-scene"), { ssr: false, loading: () => null });

export interface HeroData {
  eyebrow?: string;
  headline: string;
  headline2?: string;
  subheadline?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  variant?: "cinematic" | "minimal" | "split";
  show3d?: boolean;
  mediaUrl?: string | null;
}

export function HeroSection({ data, stats }: { data: HeroData; stats?: Array<{ value: string; label: string }> }) {
  const { resolvedTheme } = useTheme();
  const reduce = useReducedMotion();
  const [canRender3d, setCanRender3d] = React.useState(false);
  React.useEffect(() => {
    if (data.show3d === false || reduce) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setCanRender3d(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [data.show3d, reduce]);

  const variant = data.variant ?? "cinematic";
  const words = [data.headline, data.headline2].filter(Boolean) as string[];

  return (
    <section className={cn("relative overflow-hidden", variant === "minimal" ? "py-20 md:py-28" : "pt-16 pb-20 md:pt-24 md:pb-28 lg:pt-28")}>
      <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <div className="grid-fade pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60" aria-hidden />
      <div className={cn("container-x relative grid items-center gap-12", variant === "minimal" ? "text-center" : "lg:grid-cols-12")}>
        <div className={cn("flex flex-col gap-6", variant === "minimal" ? "mx-auto max-w-3xl items-center" : "lg:col-span-7")}>
          {data.eyebrow ? (
            <motion.span initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-caption text-fg-muted backdrop-blur">
              <span className="size-1.5 rounded-full bg-accent-2" />
              {data.eyebrow}
            </motion.span>
          ) : null}
          <h1 className="text-display text-fg">
            {words.map((w, i) => (
              <motion.span key={i} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }} className={cn("block", i === words.length - 1 && words.length > 1 && "gradient-text pb-1")}>
                {w}
              </motion.span>
            ))}
          </h1>
          {data.subheadline ? (
            <motion.p initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="max-w-xl text-body-lg text-fg-muted">
              {data.subheadline}
            </motion.p>
          ) : null}
          <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="flex flex-wrap items-center gap-3">
            {data.primaryCta ? (
              <Button asChild size="lg">
                <Link href={data.primaryCta.href}>
                  {data.primaryCta.label} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
            ) : null}
            {data.secondaryCta ? (
              <Button asChild size="lg" variant="secondary">
                <Link href={data.secondaryCta.href}>
                  <PlayCircle /> {data.secondaryCta.label}
                </Link>
              </Button>
            ) : null}
          </motion.div>
          {stats?.length ? (
            <motion.dl initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.55 }} className="mt-4 grid grid-cols-2 gap-6 border-t border-border pt-6 sm:grid-cols-4">
              {stats.slice(0, 4).map((s) => (
                <div key={s.label} className="flex flex-col gap-0.5">
                  <dt className="order-2 text-caption text-fg-muted">{s.label}</dt>
                  <dd className="order-1 text-h3 text-fg">{s.value}</dd>
                </div>
              ))}
            </motion.dl>
          ) : null}
        </div>
        {variant !== "minimal" ? (
          <div className="relative hidden aspect-square w-full lg:col-span-5 lg:block">
            {canRender3d ? (
              <div className="absolute inset-0">
                <HeroScene dark={resolvedTheme === "dark"} />
              </div>
            ) : data.mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.mediaUrl} alt="" className="absolute inset-0 size-full rounded-2xl object-cover" />
            ) : (
              <div className="absolute inset-8 rounded-full bg-[radial-gradient(circle_at_30%_30%,var(--accent-soft),transparent_60%)]" aria-hidden />
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
