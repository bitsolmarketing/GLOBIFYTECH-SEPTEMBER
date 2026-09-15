import "server-only";
import { env } from "@/config/env";
import { log } from "@/server/log";

export interface SmsProvider {
  readonly name: string;
  send(to: string, text: string): Promise<{ id: string | null }>;
}

class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  async send(to: string, text: string) {
    log.info("sms (console driver)", { to, text: text.slice(0, 160) });
    return { id: null };
  }
}

class TwilioSmsProvider implements SmsProvider {
  readonly name = "twilio";
  async send(to: string, text: string) {
    const e = env();
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${e.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to.startsWith("+") ? to : `+${to}`, From: e.TWILIO_FROM ?? "", Body: text }),
    });
    if (!res.ok) throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { sid?: string };
    return { id: body.sid ?? null };
  }
}

let provider: SmsProvider | undefined;
export function smsProvider(): SmsProvider {
  if (provider) return provider;
  const e = env();
  provider = e.SMS_DRIVER === "twilio" && e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN ? new TwilioSmsProvider() : new ConsoleSmsProvider();
  return provider;
}
