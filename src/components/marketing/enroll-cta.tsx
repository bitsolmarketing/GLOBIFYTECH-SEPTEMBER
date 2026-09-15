"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { enrollNowAction } from "@/server/actions/enroll";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { formatMoney, formatDate } from "@/lib/utils";

export interface EnrollCtaProps {
  courseId: string;
  slug: string;
  signedIn: boolean;
  enrolled: boolean;
  price: number;
  discountPrice: number | null;
  currency: string;
  batches: Array<{ id: string; code: string; name: string; startDate: Date | string; mode: string; seatsLeft: number; schedule: Array<{ dayOfWeek: number; startTime: string; endTime: string }> }>;
  feePlans: Array<{ id: string; name: string; totalAmount: number; installments: number; isDefault: boolean }>;
  labels: { enroll: string; continue: string; apply: string };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EnrollCta({ courseId, slug, signedIn, enrolled, price, discountPrice, currency, batches, feePlans, labels }: EnrollCtaProps) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [batchId, setBatchId] = React.useState<string>(batches[0]?.id ?? "");
  const [feePlanId, setFeePlanId] = React.useState<string>(feePlans.find((p) => p.isDefault)?.id ?? feePlans[0]?.id ?? "");
  const effective = discountPrice != null && discountPrice < price ? discountPrice : price;

  const enroll = () =>
    start(async () => {
      const res = await enrollNowAction({ courseId, batchId: batchId || null, feePlanId: feePlanId || null });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success("You're enrolled. Welcome aboard!");
      router.push(res.data.redirectTo);
    });

  return (
    <div className="surface-raised sticky top-24 flex flex-col gap-5 p-6">
      <div className="flex items-baseline gap-2">
        {effective > 0 ? (
          <>
            <span className="text-h2 text-fg">{formatMoney(effective, currency)}</span>
            {discountPrice != null && discountPrice < price ? <span className="text-body-sm text-fg-subtle line-through">{formatMoney(price, currency)}</span> : null}
          </>
        ) : (
          <span className="text-h2 text-fg">Free</span>
        )}
      </div>
      {enrolled ? (
        <Button asChild size="lg" className="w-full">
          <Link href={`/student/course/${courseId}`}>
            {labels.continue} <ArrowRight className="rtl:rotate-180" />
          </Link>
        </Button>
      ) : (
        <>
          {batches.length ? (
            <div className="flex flex-col gap-2">
              <p className="text-label text-fg-subtle">Choose a batch</p>
              <RadioGroup value={batchId} onValueChange={setBatchId} className="gap-2">
                {batches.map((b) => (
                  <RadioCard key={b.id} value={b.id} title={`${b.name} · starts ${formatDate(b.startDate)}`} description={`${b.mode.replace("_", " ").toLowerCase()} · ${b.schedule.map((s) => `${DAYS[s.dayOfWeek]} ${s.startTime}`).join(", ") || "schedule TBA"} · ${b.seatsLeft} seats left`} className="p-3" />
                ))}
              </RadioGroup>
            </div>
          ) : null}
          {feePlans.length > 1 ? (
            <div className="flex flex-col gap-2">
              <p className="text-label text-fg-subtle">Payment plan</p>
              <RadioGroup value={feePlanId} onValueChange={setFeePlanId} className="gap-2">
                {feePlans.map((p) => (
                  <RadioCard key={p.id} value={p.id} title={p.name} description={`${formatMoney(p.totalAmount, currency)}${p.installments > 1 ? ` in ${p.installments} installments` : ""}`} className="p-3" />
                ))}
              </RadioGroup>
            </div>
          ) : null}
          {signedIn ? (
            <Button size="lg" className="w-full" loading={pending} onClick={enroll}>
              {labels.enroll} <ArrowRight className="rtl:rotate-180" />
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href={`/sign-up?next=${encodeURIComponent(`/courses/${slug}`)}`}>
                {labels.enroll} <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          )}
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href={`/apply?course=${slug}`}>{labels.apply}</Link>
          </Button>
        </>
      )}
      <ul className="flex flex-col gap-2 text-body-sm text-fg-muted">
        {["Certificate on completion", "Internship eligibility & job assistance", "Recordings of every live class", "Globify AI tutor included"].map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-success" /> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
