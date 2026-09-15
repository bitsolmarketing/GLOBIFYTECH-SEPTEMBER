import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/config/env";
import { log } from "@/server/log";

export interface WhatsAppMessage {
  to: string; // E.164 without "+", e.g. 923391110171
  text?: string;
  template?: { name: string; language?: string; components?: unknown[] };
}

export interface WhatsAppProvider {
  readonly name: string;
  send(message: WhatsAppMessage): Promise<{ id: string | null }>;
}

export function normalizePhone(input: string): string {
  let digits = input.replace(/[^0-9]/g, "");
  if (digits.startsWith("0") && digits.length === 11) digits = `92${digits.slice(1)}`; // PK local → E.164
  return digits;
}

class ConsoleWhatsAppProvider implements WhatsAppProvider {
  readonly name = "console";
  async send(message: WhatsAppMessage) {
    log.info("whatsapp (console driver)", { to: message.to, text: message.text?.slice(0, 200), template: message.template?.name });
    return { id: null };
  }
}

/** Meta WhatsApp Cloud API. Token stays server-side; never exposed. */
class MetaWhatsAppProvider implements WhatsAppProvider {
  readonly name = "meta";
  async send(message: WhatsAppMessage) {
    const e = env();
    const url = `https://graph.facebook.com/v20.0/${e.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const payload = message.template
      ? {
          messaging_product: "whatsapp",
          to: message.to,
          type: "template",
          template: { name: message.template.name, language: { code: message.template.language ?? "en" }, components: message.template.components },
        }
      : { messaging_product: "whatsapp", to: message.to, type: "text", text: { body: message.text ?? "" } };
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${e.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`WhatsApp error ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { messages?: Array<{ id: string }> };
    return { id: body.messages?.[0]?.id ?? null };
  }
}

let provider: WhatsAppProvider | undefined;
export function whatsappProvider(): WhatsAppProvider {
  if (provider) return provider;
  const e = env();
  provider = e.WHATSAPP_DRIVER === "meta" && e.WHATSAPP_ACCESS_TOKEN && e.WHATSAPP_PHONE_NUMBER_ID ? new MetaWhatsAppProvider() : new ConsoleWhatsAppProvider();
  return provider;
}

/** Verifies X-Hub-Signature-256 on inbound webhooks. */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = env().WHATSAPP_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}
