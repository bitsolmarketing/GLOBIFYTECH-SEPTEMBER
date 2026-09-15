import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/seo/json-ld";
import { faqJsonLd } from "@/lib/seo";
import { Reveal } from "../motion";
import { SectionIntro } from "./features";

export function FaqSection({ data, items }: { data: { title?: string }; items: Array<{ id: string; question: string; answer: string }> }) {
  if (!items.length) return null;
  return (
    <section className="py-20 md:py-28">
      <JsonLd data={faqJsonLd(items)} />
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionIntro eyebrow="FAQ" title={data.title ?? "Frequently asked questions"} subtitle="Still curious? Talk to admissions on WhatsApp, any day 9 AM – 9 PM." className="mb-0" />
        </div>
        <Reveal className="lg:col-span-8">
          <Accordion type="single" collapsible className="surface divide-y divide-border px-6">
            {items.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-base">{f.question}</AccordionTrigger>
                <AccordionContent className="text-body">{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
