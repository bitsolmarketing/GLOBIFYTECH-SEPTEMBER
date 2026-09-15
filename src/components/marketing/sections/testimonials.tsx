import { Star, Quote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { RevealGroup, RevealItem } from "../motion";
import { SectionIntro } from "./features";

export interface TestimonialItem {
  id: string;
  name: string;
  role?: string | null;
  company?: string | null;
  quote: string;
  rating: number;
  outcome?: string | null;
  courseTitle?: string | null;
  avatar?: { url: string } | null;
}

export function TestimonialsSection({ data, items }: { data: { title?: string; subtitle?: string }; items: TestimonialItem[] }) {
  if (!items.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <SectionIntro eyebrow="Student success" title={data.title} subtitle={data.subtitle} />
        <RevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <RevealItem key={t.id}>
              <figure className="surface flex h-full flex-col gap-5 p-6">
                <Quote className="size-5 text-accent" aria-hidden />
                <blockquote className="text-body text-fg">{t.quote}</blockquote>
                <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                  <Avatar name={t.name} src={t.avatar?.url} size="md" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{t.name}</span>
                    <span className="truncate text-caption text-fg-muted">{[t.role, t.company].filter(Boolean).join(" · ") || t.courseTitle}</span>
                  </div>
                  {t.outcome ? <span className="ms-auto rounded-full bg-success-soft px-2 py-0.5 text-caption font-medium text-success">{t.outcome}</span> : null}
                </figcaption>
                <div className="flex gap-0.5" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={i < t.rating ? "size-3.5 fill-warning text-warning" : "size-3.5 text-border-strong"} />
                  ))}
                </div>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
