import { CountUp, Reveal, RevealGroup, RevealItem } from "../motion";

export interface StatsData {
  title?: string;
  items: Array<{ value: string; label: string; hint?: string }>;
}

export function StatsSection({ data }: { data: StatsData }) {
  return (
    <section className="border-y border-border bg-bg-subtle py-14 md:py-16">
      <div className="container-x">
        {data.title ? (
          <Reveal className="mb-8 text-center">
            <p className="text-label text-fg-subtle">{data.title}</p>
          </Reveal>
        ) : null}
        <RevealGroup className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {data.items.map((s) => (
            <RevealItem key={s.label} className="flex flex-col items-center gap-1 text-center">
              <span className="text-h1 gradient-text">
                <CountUp value={s.value} />
              </span>
              <span className="text-sm font-medium text-fg">{s.label}</span>
              {s.hint ? <span className="text-caption text-fg-subtle">{s.hint}</span> : null}
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
