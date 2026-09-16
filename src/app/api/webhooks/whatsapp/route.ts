import { NextResponse } from "next/server";
import { prisma } from "@/server/db/prisma";
import { verifyWhatsAppSignature, normalizePhone } from "@/server/providers/whatsapp";
import { capturePublicLead } from "@/server/services/crm";
import { enforceRateLimit } from "@/server/rate-limit";
import { env } from "@/config/env";
import { log } from "@/server/log";

export const dynamic = "force-dynamic";

/** Meta webhook verification handshake. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = env().WHATSAPP_VERIFY_TOKEN;
  if (url.searchParams.get("hub.mode") === "subscribe" && token && url.searchParams.get("hub.verify_token") === token) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

interface MetaWebhook {
  entry?: Array<{ id?: string; changes?: Array<{ value?: { messages?: Array<{ id: string; from: string; text?: { body?: string }; type?: string }>; contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>; statuses?: Array<{ id: string; status: string }> } }> }>;
}

/**
 * Inbound WhatsApp messages become CRM leads so nothing from the number on the
 * website is ever lost. Delivery statuses are recorded for auditing.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  try {
    await enforceRateLimit("webhook:whatsapp", 600, 60);
    if (!verifyWhatsAppSignature(raw, req.headers.get("x-hub-signature-256"))) {
      log.warn("whatsapp webhook signature rejected");
      return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
    }
    const body = JSON.parse(raw) as MetaWebhook;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value ?? {};
        for (const status of value.statuses ?? []) {
          await prisma.webhookEvent.upsert({
            where: { provider_providerEventId: { provider: "WHATSAPP", providerEventId: status.id } },
            update: { type: `message.${status.status}`, processedAt: new Date() },
            create: { provider: "WHATSAPP", providerEventId: status.id, type: `message.${status.status}`, payload: status as never, processedAt: new Date() },
          });
        }
        for (const message of value.messages ?? []) {
          const seen = await prisma.webhookEvent.findUnique({ where: { provider_providerEventId: { provider: "WHATSAPP", providerEventId: message.id } } });
          if (seen?.processedAt) continue;
          const phone = normalizePhone(message.from);
          const name = value.contacts?.find((c) => c.wa_id === message.from)?.profile?.name ?? `WhatsApp ${phone.slice(-4)}`;
          const text = message.text?.body?.slice(0, 2000) ?? `[${message.type ?? "media"} message]`;
          await capturePublicLead({ name, phone, message: text, source: "WHATSAPP" });
          await prisma.webhookEvent.upsert({
            where: { provider_providerEventId: { provider: "WHATSAPP", providerEventId: message.id } },
            update: { processedAt: new Date() },
            create: { provider: "WHATSAPP", providerEventId: message.id, type: "message.received", payload: message as never, processedAt: new Date() },
          });
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    log.error("whatsapp webhook failed", { error: String(error) });
    return NextResponse.json({ error: "Webhook rejected." }, { status: 400 });
  }
}
