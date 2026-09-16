import "server-only";
import { NextResponse } from "next/server";
import { handlePaymentWebhook } from "@/server/services/finance";
import { paymentDriver, type ProviderKey } from "@/server/providers/payments";
import { enforceRateLimit } from "@/server/rate-limit";
import { log } from "@/server/log";

/**
 * Shared handler for every payment provider webhook. Each provider driver
 * verifies its own signature and normalises the event; recording is idempotent
 * through the WebhookEvent table, so replays are safe.
 */
export function paymentWebhookRoute(provider: ProviderKey) {
  return async function POST(req: Request) {
    const raw = await req.text();
    try {
      await enforceRateLimit(`webhook:${provider}`, 600, 60);
      const result = await paymentDriver(provider).parseWebhook(raw, req.headers);
      const outcome = await handlePaymentWebhook(provider, result);
      log.info("payment webhook", { provider, type: result.type, ...outcome });
      return NextResponse.json({ received: true });
    } catch (error) {
      log.error("payment webhook failed", { provider, error: String(error) });
      // 400 tells the provider the payload was rejected so it retries or alerts.
      return NextResponse.json({ error: "Webhook rejected." }, { status: 400 });
    }
  };
}
