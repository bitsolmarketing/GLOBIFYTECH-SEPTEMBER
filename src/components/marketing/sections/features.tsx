import { Sparkles, FolderKanban, Briefcase, Users, Video, Award, Bot, Rocket, ShieldCheck, LineChart, MessageSquare, Globe, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal, RevealGroup, RevealItem } from "../motion";

const ICONS: Record<string, React.ComponentType<LucideProps>> = { sparkles: Sparkles, projects: FolderKanban, career: Briefcase, mentors: Users, live: Video, certificate: Award, ai: Bot, launch: Rocket, trust: ShieldCheck, growth: LineChart, community: MessageSquare, global: Globe };

export interface FeaturesData {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  items: Array<{ icon?: string; title: string; description: string }>;
  layout?: "grid" | "list" | "bento";
}

export function SectionIntro({ eyebrow, title, subtitle, align = "start", className }: { eyebrow?: string; title?: string; subtitle?: string; align?: "start" | "center"; className?: string }) {
  if (!eyebrow && !title && !subtitle) return null;
  return (
    <Reveal className={cn("mb-10 flex max-w-2xl flex-col gap-3 md:mb-14", align === "center" && "mx-auto items-center text-center", className)}>
      {eyebrow ? <p className="text-label text-accent">{eyebrow}</p> : null}
      {title ? <h2 className="text-h1 text-fg">{title}</h2> : null}
      {subtitle ? <p className="text-body-lg text-fg-muted">{subtitle}</p> : null}
    </Reveal>
  );
}

export function FeaturesSection({ data }: { data: FeaturesData }) {
  const layout = data.layout ?? "grid";
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow={data.eyebrow} title={data.title} subtitle={data.subtitle} />
        <RevealGroup className={cn(layout === "list" ? "grid gap-4 md:grid-cols-2" : layout === "bento" ? "grid gap-4 md:grid-cols-6" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3")}>
          {data.items.map((item, i) => {
            const Icon = ICONS[item.icon ?? ""] ?? Sparkles;
            const bento = layout === "bento" ? (i === 0 ? "md:col-span-4" : i === 1 ? "md:col-span-2" : i === 2 ? "md:col-span-2" : "md:col-span-2") : "";
            return (
              <RevealItem key={item.title} className={bento}>
                <div className={cn("surface surface-hover flex h-full gap-4 p-6", layout === "list" ? "flex-row" : "flex-col")}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-h4 text-fg">{item.title}</h3>
                    <p className="text-body-sm text-fg-muted">{item.description}</p>
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
