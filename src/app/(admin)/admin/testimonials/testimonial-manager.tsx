"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Quote, Star, Trash2, ExternalLink } from "lucide-react";
import { saveTestimonialAction, deleteTestimonialAction, saveSuccessStoryAction } from "@/server/actions/admin";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge, statusVariant } from "@/components/ui/badge";
import { SimpleSelect } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toaster";
import { cn, enumLabel } from "@/lib/utils";

interface Testimonial { id: string; name: string; role: string; company: string; quote: string; rating: number; courseTitle: string; outcome: string; isFeatured: boolean; isApproved: boolean; order: number }
interface Story { id: string; name: string; slug: string; headline: string; story: string; outcome: string; courseTitle: string; status: string; isFeatured: boolean }

const EMPTY_T = { name: "", role: "", company: "", quote: "", rating: 5, courseTitle: "", outcome: "", isFeatured: false, isApproved: true, order: 0 };
const EMPTY_S = { name: "", headline: "", story: "", outcome: "", courseTitle: "", status: "DRAFT", isFeatured: false };

export function TestimonialManager({ tab, testimonials, stories }: { tab: "quotes" | "stories"; testimonials: Testimonial[]; stories: Story[] }) {
  const router = useRouter();
  const [quote, setQuote] = React.useState<(typeof EMPTY_T & { id?: string }) | null>(null);
  const [story, setStory] = React.useState<(typeof EMPTY_S & { id?: string }) | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [pending, start] = React.useTransition();

  if (tab === "stories") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end"><Button size="sm" onClick={() => setStory({ ...EMPTY_S })}><Plus /> New story</Button></div>
        {stories.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {stories.map((s) => (
              <article key={s.id} className="surface flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-h4">{s.headline}</p><p className="text-caption text-fg-muted">{s.name}{s.courseTitle ? ` · ${s.courseTitle}` : ""}{s.outcome ? ` · ${s.outcome}` : ""}</p></div>
                  <div className="flex items-center gap-1"><Badge variant={statusVariant(s.status)}>{enumLabel(s.status)}</Badge>{s.status === "PUBLISHED" ? <Button asChild variant="ghost" size="sm"><Link href={`/success-stories/${s.slug}`} target="_blank" aria-label="View"><ExternalLink /></Link></Button> : null}</div>
                </div>
                <div className="prose-globify line-clamp-3 text-body-sm text-fg-muted" dangerouslySetInnerHTML={{ __html: s.story }} />
                <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setStory({ id: s.id, name: s.name, headline: s.headline, story: s.story, outcome: s.outcome, courseTitle: s.courseTitle, status: s.status, isFeatured: s.isFeatured })}>Edit</Button>{s.isFeatured ? <Badge variant="accent">Featured</Badge> : null}</div>
              </article>
            ))}
          </div>
        ) : <EmptyState icon={<Star />} title="No success stories yet." description="Long-form stories carry the 76% earning within six months claim." action={<Button size="sm" onClick={() => setStory({ ...EMPTY_S })}>Write a story</Button>} />}

        <Dialog open={!!story} onOpenChange={(o) => !o && setStory(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{story?.id ? "Edit success story" : "New success story"}</DialogTitle></DialogHeader>
            {story ? (
              <div className="grid max-h-[60vh] gap-4 overflow-y-auto pe-1 sm:grid-cols-2">
                <Field label="Student name" htmlFor="st-name" error={errors.name} required><Input id="st-name" value={story.name} onChange={(e) => setStory({ ...story, name: e.target.value })} /></Field>
                <Field label="Course" htmlFor="st-course"><Input id="st-course" value={story.courseTitle} onChange={(e) => setStory({ ...story, courseTitle: e.target.value })} /></Field>
                <Field label="Headline" htmlFor="st-head" error={errors.headline} required className="sm:col-span-2"><Input id="st-head" value={story.headline} onChange={(e) => setStory({ ...story, headline: e.target.value })} placeholder="From zero to junior developer in seven months" /></Field>
                <Field label="Outcome" htmlFor="st-out" hint="e.g. Hired at Systems Ltd"><Input id="st-out" value={story.outcome} onChange={(e) => setStory({ ...story, outcome: e.target.value })} /></Field>
                <Field label="Status" htmlFor="st-status"><SimpleSelect value={story.status} onValueChange={(v) => setStory({ ...story, status: v })} options={["DRAFT", "PUBLISHED", "ARCHIVED"].map((s) => ({ value: s, label: enumLabel(s) }))} /></Field>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 sm:col-span-2"><Label htmlFor="st-feat">Feature on the home page</Label><Switch id="st-feat" checked={story.isFeatured} onCheckedChange={(v) => setStory({ ...story, isFeatured: v })} /></div>
                <Field label="Story" htmlFor="st-body" error={errors.story} className="sm:col-span-2"><RichTextEditor value={story.story} onChange={(v) => setStory({ ...story, story: v })} /></Field>
              </div>
            ) : null}
            <DialogFooter><Button variant="ghost" onClick={() => setStory(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!story) return; setErrors({}); const res = await saveSuccessStoryAction({ name: story.name, headline: story.headline, story: story.story, outcome: story.outcome, courseTitle: story.courseTitle, coverMediaId: null, status: story.status as "DRAFT", isFeatured: story.isFeatured }, story.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Story saved."); setStory(null); router.refresh(); })}>Save story</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end"><Button size="sm" onClick={() => setQuote({ ...EMPTY_T, order: testimonials.length })}><Plus /> New testimonial</Button></div>
      {testimonials.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((t) => (
            <article key={t.id} className={cn("surface flex flex-col gap-3 p-5", !t.isApproved && "opacity-60")}>
              <Quote className="size-5 text-accent" />
              <p className="text-body-sm">{t.quote}</p>
              <div className="mt-auto">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-caption text-fg-muted">{[t.role, t.company].filter(Boolean).join(", ") || t.courseTitle}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className="text-caption text-warning">{"★".repeat(t.rating)}</span>
                  {t.isFeatured ? <Badge variant="accent">Featured</Badge> : null}
                  {!t.isApproved ? <Badge variant="warning">Not approved</Badge> : null}
                  {t.outcome ? <Badge variant="success">{t.outcome}</Badge> : null}
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setQuote({ id: t.id, name: t.name, role: t.role, company: t.company, quote: t.quote, rating: t.rating, courseTitle: t.courseTitle, outcome: t.outcome, isFeatured: t.isFeatured, isApproved: t.isApproved, order: t.order })}>Edit</Button>
                <ConfirmAction title={`Delete the testimonial from ${t.name}?`} confirmLabel="Delete" variant="ghost" action={() => deleteTestimonialAction(t.id)} successMessage="Testimonial deleted."><Trash2 /></ConfirmAction>
              </div>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={<Quote />} title="No testimonials yet." description="Quotes appear in the testimonials section of any page." action={<Button size="sm" onClick={() => setQuote({ ...EMPTY_T })}>Add a testimonial</Button>} />}

      <Dialog open={!!quote} onOpenChange={(o) => !o && setQuote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{quote?.id ? "Edit testimonial" : "New testimonial"}</DialogTitle></DialogHeader>
          {quote ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="t-name" error={errors.name} required><Input id="t-name" value={quote.name} onChange={(e) => setQuote({ ...quote, name: e.target.value })} /></Field>
              <Field label="Role" htmlFor="t-role"><Input id="t-role" value={quote.role} onChange={(e) => setQuote({ ...quote, role: e.target.value })} placeholder="Performance Marketer" /></Field>
              <Field label="Company" htmlFor="t-company"><Input id="t-company" value={quote.company} onChange={(e) => setQuote({ ...quote, company: e.target.value })} /></Field>
              <Field label="Course" htmlFor="t-course"><Input id="t-course" value={quote.courseTitle} onChange={(e) => setQuote({ ...quote, courseTitle: e.target.value })} /></Field>
              <Field label="Quote" htmlFor="t-quote" error={errors.quote} required className="sm:col-span-2"><Textarea id="t-quote" rows={4} value={quote.quote} onChange={(e) => setQuote({ ...quote, quote: e.target.value })} /></Field>
              <Field label="Rating" htmlFor="t-rating"><Input id="t-rating" type="number" min={1} max={5} value={quote.rating} onChange={(e) => setQuote({ ...quote, rating: Number(e.target.value) })} /></Field>
              <Field label="Outcome" htmlFor="t-outcome" hint="Short badge, e.g. Hired in 3 months"><Input id="t-outcome" value={quote.outcome} onChange={(e) => setQuote({ ...quote, outcome: e.target.value })} /></Field>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="t-feat">Featured</Label><Switch id="t-feat" checked={quote.isFeatured} onCheckedChange={(v) => setQuote({ ...quote, isFeatured: v })} /></div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2"><Label htmlFor="t-appr">Approved</Label><Switch id="t-appr" checked={quote.isApproved} onCheckedChange={(v) => setQuote({ ...quote, isApproved: v })} /></div>
              <Field label="Order" htmlFor="t-order"><Input id="t-order" type="number" min={0} value={quote.order} onChange={(e) => setQuote({ ...quote, order: Number(e.target.value) })} /></Field>
            </div>
          ) : null}
          <DialogFooter><Button variant="ghost" onClick={() => setQuote(null)}>Cancel</Button><Button loading={pending} onClick={() => start(async () => { if (!quote) return; setErrors({}); const res = await saveTestimonialAction({ name: quote.name, role: quote.role, company: quote.company, quote: quote.quote, rating: quote.rating, avatarMediaId: null, courseTitle: quote.courseTitle, outcome: quote.outcome, isFeatured: quote.isFeatured, isApproved: quote.isApproved, order: quote.order }, quote.id); if (!res.ok) { setErrors(res.error.fields ?? {}); toast.error(res.error.message); return; } toast.success("Testimonial saved."); setQuote(null); router.refresh(); })}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
