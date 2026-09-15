import "server-only";
import nodemailer from "nodemailer";
import { env } from "@/config/env";
import { log } from "@/server/log";

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ id: string | null }>;
}

class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  async send(message: EmailMessage) {
    log.info("email (console driver)", { to: message.to, subject: message.subject, preview: message.text?.slice(0, 200) ?? message.html.replace(/<[^>]+>/g, " ").slice(0, 200) });
    return { id: null };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";
  private transport = nodemailer.createTransport({
    host: env().SMTP_HOST,
    port: env().SMTP_PORT,
    secure: env().SMTP_PORT === 465,
    auth: env().SMTP_USER ? { user: env().SMTP_USER, pass: env().SMTP_PASS } : undefined,
  });
  async send(message: EmailMessage) {
    const info = await this.transport.sendMail({
      from: env().EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });
    return { id: info.messageId ?? null };
  }
}

class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";
  async send(message: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env().RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env().EMAIL_FROM,
        to: Array.isArray(message.to) ? message.to : [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
        tags: message.tags ? Object.entries(message.tags).map(([name, value]) => ({ name, value })) : undefined,
      }),
    });
    if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { id?: string };
    return { id: body.id ?? null };
  }
}

let provider: EmailProvider | undefined;

export function emailProvider(): EmailProvider {
  if (provider) return provider;
  const driver = env().EMAIL_DRIVER;
  if (driver === "smtp" && env().SMTP_HOST) provider = new SmtpEmailProvider();
  else if (driver === "resend" && env().RESEND_API_KEY) provider = new ResendEmailProvider();
  else {
    if (driver !== "console") log.warn(`EMAIL_DRIVER=${driver} is not fully configured; falling back to console`);
    provider = new ConsoleEmailProvider();
  }
  return provider;
}

/** Minimal branded HTML wrapper for transactional email. */
export function emailLayout({ title, body, cta }: { title: string; body: string; cta?: { label: string; href: string } }): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://globifytech.com";
  return `<!doctype html><html><body style="margin:0;background:#f7f8fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0d12">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e6e8ec;border-radius:14px;overflow:hidden">
<tr><td style="padding:28px 32px 0"><a href="${base}" style="text-decoration:none;color:#0b0d12;font-weight:600;font-size:17px">Globify <span style="color:#5b6472">Tech</span></a></td></tr>
<tr><td style="padding:24px 32px 8px;font-size:22px;font-weight:600;letter-spacing:-0.02em">${title}</td></tr>
<tr><td style="padding:0 32px 24px;font-size:15px;line-height:1.6;color:#5b6472">${body}</td></tr>
${cta ? `<tr><td style="padding:0 32px 32px"><a href="${cta.href}" style="display:inline-block;background:#2563ff;color:#fff;text-decoration:none;font-weight:500;padding:12px 20px;border-radius:10px">${cta.label}</a></td></tr>` : ""}
<tr><td style="padding:16px 32px 24px;border-top:1px solid #e6e8ec;font-size:12px;color:#8a93a1">Learn Today. Lead Tomorrow. · Globify Tech, Faisalabad</td></tr>
</table></td></tr></table></body></html>`;
}
