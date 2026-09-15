"use client";

import * as React from "react";
import { CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { startCheckoutAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { formatMoney } from "@/lib/utils";

type ProviderKey = "STRIPE" | "PAYPAL" | "JAZZCASH" | "EASYPAISA" | "BANK_TRANSFER";

const META: Record<ProviderKey, { label: string; description: string; icon: React.ReactNode }> = {
  STRIPE: { label: "Card", description: "Visa, Mastercard — secure checkout", icon: <CreditCard /> },
  PAYPAL: { label: "PayPal", description: "Pay from your PayPal balance or card", icon: <Wallet /> },
  JAZZCASH: { label: "JazzCash", description: "Mobile wallet or card via JazzCash", icon: <Smartphone /> },
  EASYPAISA: { label: "Easypaisa", description: "Mobile wallet via Easypaisa", icon: <Smartphone /> },
  BANK_TRANSFER: { label: "Bank transfer", description: "Transfer and share the receipt — confirmed within one working day", icon: <Landmark /> },
};

export function Checkout({ invoiceId, amount, currency, providers }: { invoiceId: string; amount: number; currency: string; providers: ProviderKey[] }) {
  const [provider, setProvider] = React.useState<ProviderKey>(providers[0] ?? "BANK_TRANSFER");
  const [instructions, setInstructions] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [formPost, setFormPost] = React.useState<{ action: string; fields: Record<string, string> } | null>(null);

  React.useEffect(() => {
    if (formPost) formRef.current?.submit();
  }, [formPost]);

  const pay = () =>
    start(async () => {
      const res = await startCheckoutAction({ invoiceId, provider });
      if (!res.ok) { toast.error(res.error.message); return; }
      const s = res.data;
      if (s.redirectUrl) {
        window.location.href = s.redirectUrl;
        return;
      }
      if (s.formPost) {
        setFormPost(s.formPost);
        return;
      }
      setInstructions(s.instructions ?? "Follow the instructions sent to your email.");
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <p className="text-body-sm text-fg-muted">Amount due</p>
        <p className="text-h3">{formatMoney(amount, currency)}</p>
      </div>
      <RadioGroup value={provider} onValueChange={(v) => setProvider(v as ProviderKey)} className="gap-2">
        {providers.map((p) => (
          <RadioCard key={p} value={p} title={META[p].label} description={META[p].description} icon={META[p].icon} className="p-3" />
        ))}
      </RadioGroup>
      {instructions ? (
        <Alert variant="info" title="Bank transfer instructions">
          {instructions}
        </Alert>
      ) : null}
      <Button size="lg" onClick={pay} loading={pending}>
        {provider === "BANK_TRANSFER" ? "Get transfer details" : `Pay ${formatMoney(amount, currency)}`}
      </Button>
      <p className="text-caption text-fg-subtle">Payments are processed by the selected provider. Globify never stores card details.</p>
      {formPost ? (
        <form ref={formRef} method="POST" action={formPost.action} className="hidden">
          {Object.entries(formPost.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      ) : null}
    </div>
  );
}
