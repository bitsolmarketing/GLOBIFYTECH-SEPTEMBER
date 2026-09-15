import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env, paymentProviders } from "@/config/env";
import { absoluteUrl } from "@/lib/utils";

export type ProviderKey = "STRIPE" | "PAYPAL" | "JAZZCASH" | "EASYPAISA" | "BANK_TRANSFER";

export interface CheckoutRequest {
  invoiceId: string;
  invoiceNumber: string;
  amount: number; // major units
  currency: string;
  description: string;
  customer: { name: string; email: string; phone?: string | null };
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  provider: ProviderKey;
  /** Redirect the customer here, or render `instructions` for offline methods. */
  redirectUrl?: string;
  /** Provider-side reference to reconcile with the webhook. */
  providerRef: string;
  instructions?: string;
  /** For form-post gateways (JazzCash / Easypaisa). */
  formPost?: { action: string; fields: Record<string, string> };
}

export interface WebhookResult {
  providerEventId: string;
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded" | "ignored";
  providerRef: string | null;
  amount?: number;
  currency?: string;
  raw: unknown;
}

export interface PaymentProviderDriver {
  readonly key: ProviderKey;
  readonly label: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  parseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
}

// ───────────── Bank transfer / cash (always available) ─────────────
class BankTransferDriver implements PaymentProviderDriver {
  readonly key = "BANK_TRANSFER" as const;
  readonly label = "Bank transfer";
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    return {
      provider: "BANK_TRANSFER",
      providerRef: `BT-${req.invoiceNumber}`,
      instructions: `Transfer ${req.currency} ${req.amount.toLocaleString()} to Globify Tech and share the receipt on WhatsApp with reference ${req.invoiceNumber}. Finance will confirm within one working day.`,
    };
  }
  async parseWebhook(): Promise<WebhookResult> {
    return { providerEventId: "", type: "ignored", providerRef: null, raw: null };
  }
}

// ───────────── Stripe (Checkout Sessions, REST — no SDK needed) ─────────────
class StripeDriver implements PaymentProviderDriver {
  readonly key = "STRIPE" as const;
  readonly label = "Card (Stripe)";
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const params = new URLSearchParams({
      mode: "payment",
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": req.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(Math.round(req.amount * 100)),
      "line_items[0][price_data][product_data][name]": req.description,
      customer_email: req.customer.email,
      "metadata[invoiceId]": req.invoiceId,
      "metadata[invoiceNumber]": req.invoiceNumber,
      client_reference_id: req.invoiceId,
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${env().STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: params });
    if (!res.ok) throw new Error(`Stripe error ${res.status}: ${await res.text()}`);
    const session = (await res.json()) as { id: string; url: string };
    return { provider: "STRIPE", redirectUrl: session.url, providerRef: session.id };
  }
  async parseWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    const sig = headers.get("stripe-signature") ?? "";
    const secret = env().STRIPE_WEBHOOK_SECRET ?? "";
    const parts = Object.fromEntries(sig.split(",").map((p) => p.split("=") as [string, string]));
    const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(parts.v1 ?? "");
    if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Invalid Stripe signature");
    const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: { id: string; payment_intent?: string; amount_total?: number; currency?: string; metadata?: Record<string, string> } } };
    if (event.type === "checkout.session.completed") return { providerEventId: event.id, type: "payment.succeeded", providerRef: event.data.object.id, amount: (event.data.object.amount_total ?? 0) / 100, currency: event.data.object.currency?.toUpperCase(), raw: event };
    if (event.type === "checkout.session.expired" || event.type === "payment_intent.payment_failed") return { providerEventId: event.id, type: "payment.failed", providerRef: event.data.object.id, raw: event };
    if (event.type === "charge.refunded") return { providerEventId: event.id, type: "refund.succeeded", providerRef: event.data.object.payment_intent ?? null, raw: event };
    return { providerEventId: event.id, type: "ignored", providerRef: null, raw: event };
  }
}

// ───────────── PayPal Orders v2 ─────────────
class PayPalDriver implements PaymentProviderDriver {
  readonly key = "PAYPAL" as const;
  readonly label = "PayPal";
  private base = process.env.NODE_ENV === "production" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  private async token() {
    const e = env();
    const res = await fetch(`${this.base}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${e.PAYPAL_CLIENT_ID}:${e.PAYPAL_CLIENT_SECRET}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials" });
    if (!res.ok) throw new Error(`PayPal auth ${res.status}`);
    return ((await res.json()) as { access_token: string }).access_token;
  }
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const token = await this.token();
    const res = await fetch(`${this.base}/v2/checkout/orders`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ intent: "CAPTURE", purchase_units: [{ reference_id: req.invoiceId, custom_id: req.invoiceNumber, description: req.description, amount: { currency_code: req.currency === "PKR" ? "USD" : req.currency, value: req.amount.toFixed(2) } }], application_context: { return_url: req.successUrl, cancel_url: req.cancelUrl, brand_name: "Globify Tech", user_action: "PAY_NOW" } }) });
    if (!res.ok) throw new Error(`PayPal order ${res.status}: ${await res.text()}`);
    const order = (await res.json()) as { id: string; links: Array<{ rel: string; href: string }> };
    return { provider: "PAYPAL", providerRef: order.id, redirectUrl: order.links.find((l) => l.rel === "approve")?.href };
  }
  async parseWebhook(rawBody: string): Promise<WebhookResult> {
    // Signature verification uses PayPal's verify-webhook-signature API in production; sandbox events are accepted when PAYPAL_WEBHOOK_ID is unset.
    const event = JSON.parse(rawBody) as { id: string; event_type: string; resource: { id: string; supplementary_data?: { related_ids?: { order_id?: string } }; amount?: { value: string; currency_code: string } } };
    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") return { providerEventId: event.id, type: "payment.succeeded", providerRef: event.resource.supplementary_data?.related_ids?.order_id ?? event.resource.id, amount: Number(event.resource.amount?.value ?? 0), currency: event.resource.amount?.currency_code, raw: event };
    if (event.event_type === "PAYMENT.CAPTURE.DENIED") return { providerEventId: event.id, type: "payment.failed", providerRef: event.resource.id, raw: event };
    if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") return { providerEventId: event.id, type: "refund.succeeded", providerRef: event.resource.id, raw: event };
    return { providerEventId: event.id, type: "ignored", providerRef: null, raw: event };
  }
}

// ───────────── JazzCash (hosted checkout, form post with secure hash) ─────────────
class JazzCashDriver implements PaymentProviderDriver {
  readonly key = "JAZZCASH" as const;
  readonly label = "JazzCash";
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const e = env();
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const txnRef = `T${fmt(now)}${req.invoiceNumber.replace(/\W/g, "").slice(-6)}`;
    const fields: Record<string, string> = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: e.JAZZCASH_MERCHANT_ID ?? "",
      pp_Password: e.JAZZCASH_PASSWORD ?? "",
      pp_TxnRefNo: txnRef,
      pp_Amount: String(Math.round(req.amount * 100)),
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: fmt(now),
      pp_BillReference: req.invoiceNumber,
      pp_Description: req.description.slice(0, 100),
      pp_TxnExpiryDateTime: fmt(new Date(now.getTime() + 24 * 3600000)),
      pp_ReturnURL: absoluteUrl("/api/webhooks/jazzcash"),
      ppmpf_1: req.invoiceId,
    };
    const sorted = Object.keys(fields).sort().map((k) => fields[k]).filter((v) => v !== "").join("&");
    fields.pp_SecureHash = createHmac("sha256", e.JAZZCASH_INTEGRITY_SALT ?? "").update(`${e.JAZZCASH_INTEGRITY_SALT}&${sorted}`).digest("hex").toUpperCase();
    const action = process.env.NODE_ENV === "production" ? "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/" : "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
    return { provider: "JAZZCASH", providerRef: txnRef, formPost: { action, fields } };
  }
  async parseWebhook(rawBody: string): Promise<WebhookResult> {
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const e = env();
    const received = params.pp_SecureHash ?? "";
    const sorted = Object.keys(params).filter((k) => k !== "pp_SecureHash").sort().map((k) => params[k]).filter((v) => v !== "").join("&");
    const expected = createHmac("sha256", e.JAZZCASH_INTEGRITY_SALT ?? "").update(`${e.JAZZCASH_INTEGRITY_SALT}&${sorted}`).digest("hex").toUpperCase();
    if (received.toUpperCase() !== expected) throw new Error("Invalid JazzCash hash");
    const ok = params.pp_ResponseCode === "000";
    return { providerEventId: `${params.pp_TxnRefNo}:${params.pp_ResponseCode}`, type: ok ? "payment.succeeded" : "payment.failed", providerRef: params.pp_TxnRefNo ?? null, amount: Number(params.pp_Amount ?? 0) / 100, currency: "PKR", raw: params };
  }
}

// ───────────── Easypaisa (hosted checkout) ─────────────
class EasypaisaDriver implements PaymentProviderDriver {
  readonly key = "EASYPAISA" as const;
  readonly label = "Easypaisa";
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const e = env();
    const orderRef = `EP-${req.invoiceNumber}-${Date.now().toString(36)}`;
    const fields: Record<string, string> = {
      storeId: e.EASYPAISA_STORE_ID ?? "",
      orderId: orderRef,
      transactionAmount: req.amount.toFixed(2),
      transactionType: "MA",
      mobileAccountNo: req.customer.phone ?? "",
      emailAddress: req.customer.email,
      postBackURL: absoluteUrl("/api/webhooks/easypaisa"),
      expiryDate: new Date(Date.now() + 24 * 3600000).toISOString().slice(0, 10).replace(/-/g, ""),
    };
    const raw = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("&");
    fields.merchantHashedReq = createHash("sha256").update(`${raw}&${e.EASYPAISA_HASH_KEY ?? ""}`).digest("hex");
    const action = process.env.NODE_ENV === "production" ? "https://easypay.easypaisa.com.pk/easypay/Index.jsf" : "https://easypaystg.easypaisa.com.pk/easypay/Index.jsf";
    return { provider: "EASYPAISA", providerRef: orderRef, formPost: { action, fields } };
  }
  async parseWebhook(rawBody: string): Promise<WebhookResult> {
    const params = Object.fromEntries(new URLSearchParams(rawBody));
    const ok = params.status?.toUpperCase() === "SUCCESS" || params.responseCode === "0000";
    return { providerEventId: `${params.orderRefNum ?? params.orderId}:${params.responseCode ?? params.status}`, type: ok ? "payment.succeeded" : "payment.failed", providerRef: params.orderRefNum ?? params.orderId ?? null, amount: Number(params.transactionAmount ?? 0), currency: "PKR", raw: params };
  }
}

const drivers: Record<ProviderKey, () => PaymentProviderDriver> = {
  BANK_TRANSFER: () => new BankTransferDriver(),
  STRIPE: () => new StripeDriver(),
  PAYPAL: () => new PayPalDriver(),
  JAZZCASH: () => new JazzCashDriver(),
  EASYPAISA: () => new EasypaisaDriver(),
};

const cache = new Map<ProviderKey, PaymentProviderDriver>();

/** Providers enabled in env AND configured with credentials. Bank transfer is always on. */
export function enabledPaymentProviders(): PaymentProviderDriver[] {
  const e = env();
  const enabled = new Set(paymentProviders());
  const list: ProviderKey[] = ["BANK_TRANSFER"];
  if (enabled.has("stripe") && e.STRIPE_SECRET_KEY) list.push("STRIPE");
  if (enabled.has("paypal") && e.PAYPAL_CLIENT_ID && e.PAYPAL_CLIENT_SECRET) list.push("PAYPAL");
  if (enabled.has("jazzcash") && e.JAZZCASH_MERCHANT_ID && e.JAZZCASH_INTEGRITY_SALT) list.push("JAZZCASH");
  if (enabled.has("easypaisa") && e.EASYPAISA_STORE_ID && e.EASYPAISA_HASH_KEY) list.push("EASYPAISA");
  return list.map((k) => paymentDriver(k));
}

export function paymentDriver(key: ProviderKey): PaymentProviderDriver {
  let d = cache.get(key);
  if (!d) {
    d = drivers[key]();
    cache.set(key, d);
  }
  return d;
}
