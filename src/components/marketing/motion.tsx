"use client";

import * as React from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

/** Fade + rise on enter, once, respecting reduced-motion. */
export function Reveal({ children, className, delay = 0, y = 12, as = "div", ...props }: { children: React.ReactNode; className?: string; delay?: number; y?: number; as?: "div" | "section" | "li" | "article" } & Omit<HTMLMotionProps<"div">, "children">) {
  const reduce = useReducedMotion();
  const Comp = (motion as unknown as Record<string, typeof motion.div>)[as] ?? motion.div;
  return (
    <Comp
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1], delay }}
      className={className}
      {...props}
    >
      {children}
    </Comp>
  );
}

/** Staggered children reveal. */
export function RevealGroup({ children, className, stagger = 0.06 }: { children: React.ReactNode; className?: string; stagger?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } } }} className={className}>
      {children}
    </motion.div>
  );
}

/** Animated number for stats. */
export function CountUp({ value, className, duration = 1.2 }: { value: string; className?: string; duration?: number }) {
  const reduce = useReducedMotion();
  const match = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const [display, setDisplay] = React.useState(reduce || !match ? value : `${match[1]}0${match[3]}`);
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    if (reduce || !match || !ref.current) return;
    const target = Number(match[2]!.replace(/,/g, ""));
    const decimals = (match[2]!.split(".")[1] ?? "").length;
    const el = ref.current;
    let raf = 0;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (duration * 1000));
        const eased = 1 - Math.pow(1 - t, 3);
        const n = target * eased;
        setDisplay(`${match[1]}${n.toLocaleString("en", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}${match[3]}`);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {display}
    </span>
  );
}
