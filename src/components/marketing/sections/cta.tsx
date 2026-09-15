import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Reveal } from "../motion";

export interface CtaData {
  title: string;
  subtitle?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  variant?: "gradient" | "dark" | "light";
}

export function CtaSection({ data }: { data: CtaData }) {
  const variant = data.variant ?? "gradient";
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <Reveal
          className={cn(
            "relative overflow-hidden rounded-2xl px-6 py-14 text-center md:px-12 md:py-20",
            variant === "gradient" && "gradient-brand text-white",
            variant === "dark" && "bg-fg text-fg-inverse",
            variant === "light" && "surface",
          )}
        >
          {variant === "gradient" ? <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_300px_at_80%_-20%,rgba(255,255,255,.35),transparent)]" aria-hidden /> : null}
          <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-5">
            <h2 className={cn("text-h1", variant === "light" ? "text-fg" : "text-white")}>{data.title}</h2>
            {data.subtitle ? <p className={cn("text-body-lg", variant === "light" ? "text-fg-muted" : "text-white/85")}>{data.subtitle}</p> : null}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant={variant === "light" ? "primary" : "inverse"} className={variant !== "light" ? "bg-white text-fg hover:bg-white/90" : undefined}>
                <Link href={data.primaryCta.href}>
                  {data.primaryCta.label} <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>
              {data.secondaryCta ? (
                <Button asChild size="lg" variant="ghost" className={variant !== "light" ? "text-white hover:bg-white/15 hover:text-white" : undefined}>
                  <Link href={data.secondaryCta.href}>
                    <MessageCircle /> {data.secondaryCta.label}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
