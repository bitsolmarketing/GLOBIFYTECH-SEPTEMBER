import { cn } from "@/lib/utils";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

export function PageHero({ eyebrow, title, description, crumbs, children, className, align = "start" }: { eyebrow?: string; title: string; description?: string | null; crumbs?: Crumb[]; children?: React.ReactNode; className?: string; align?: "start" | "center" }) {
  return (
    <section className={cn("relative overflow-hidden border-b border-border bg-bg-subtle", className)}>
      <div className="hero-glow pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div className={cn("container-x relative flex flex-col gap-4 py-14 md:py-20", align === "center" && "items-center text-center")}>
        {crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}
        {eyebrow ? <p className="text-label text-accent">{eyebrow}</p> : null}
        <h1 className="max-w-3xl text-h1 text-fg">{title}</h1>
        {description ? <p className="max-w-2xl text-body-lg text-fg-muted">{description}</p> : null}
        {children}
      </div>
    </section>
  );
}
