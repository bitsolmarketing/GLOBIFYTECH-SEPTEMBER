"use server";

import { ok, fail, AppError, type ActionResult } from "@/server/errors";
import { publicLeadSchema } from "@/lib/validation/crm";
import { contactSchema, eventRegistrationSchema } from "@/lib/validation/cms";
import { fieldErrors } from "@/lib/validation/common";
import { capturePublicLead } from "@/server/services/crm";
import { registerForEvent } from "@/server/services/cms";
import { enforceRateLimit } from "@/server/rate-limit";
import { requestMeta } from "@/server/audit";
import { getSession } from "@/server/auth/session";
import { emailLayout, emailProvider } from "@/server/providers/email";
import { notifyRole } from "@/server/services/notifications";
import { site } from "@/config/site";

/** Course enquiry / "Talk to admissions" forms. */
export async function captureLeadAction(_prev: ActionResult<{ duplicate: boolean }> | null, formData: FormData): Promise<ActionResult<{ duplicate: boolean }>> {
  const parsed = publicLeadSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    city: formData.get("city") ?? "",
    courseId: formData.get("courseId") || null,
    interest: formData.get("interest") ?? "",
    message: formData.get("message") ?? "",
    preferredMode: formData.get("preferredMode") || undefined,
    source: formData.get("source") || "WEBSITE",
    utm: { source: formData.get("utm_source") || undefined, medium: formData.get("utm_medium") || undefined, campaign: formData.get("utm_campaign") || undefined },
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  const { ip } = await requestMeta();
  try {
    await enforceRateLimit(`lead:${ip ?? "unknown"}`, 5, 600);
    const { duplicate } = await capturePublicLead(parsed.data, { ip });
    return ok({ duplicate });
  } catch (error) {
    return fail(error);
  }
}

export async function contactAction(_prev: ActionResult<undefined> | null, formData: FormData): Promise<ActionResult<undefined>> {
  const parsed = contactSchema.safeParse({ name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone") ?? "", subject: formData.get("subject"), message: formData.get("message"), website: formData.get("website") ?? "" });
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  const { ip } = await requestMeta();
  try {
    await enforceRateLimit(`contact:${ip ?? "unknown"}`, 5, 600);
    const d = parsed.data;
    await capturePublicLead({ name: d.name, phone: d.phone || "0000000", email: d.email, message: `${d.subject}\n\n${d.message}`, source: "WEBSITE", courseId: null, interest: d.subject }, { ip }).catch(() => undefined);
    await emailProvider().send({ to: site.contact.email, replyTo: d.email, subject: `Contact: ${d.subject}`, html: emailLayout({ title: d.subject, body: `<p><strong>${d.name}</strong> (${d.email}${d.phone ? `, ${d.phone}` : ""}) wrote:</p><p>${d.message.replace(/\n/g, "<br/>")}</p>` }), text: `${d.name} <${d.email}>\n\n${d.message}` });
    await notifyRole(["ADMISSIONS_MANAGER", "COUNSELLOR"], { event: "SYSTEM", data: { name: d.name }, href: "/admin/leads", fallback: { title: `New contact message from ${d.name}`, body: d.subject }, channels: ["IN_APP"] });
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}

export async function registerEventAction(_prev: ActionResult<undefined> | null, formData: FormData): Promise<ActionResult<undefined>> {
  const parsed = eventRegistrationSchema.safeParse({ eventId: formData.get("eventId"), name: formData.get("name"), email: formData.get("email"), phone: formData.get("phone") ?? "" });
  if (!parsed.success) return fail(AppError.validation(undefined, fieldErrors(parsed.error)));
  const { ip } = await requestMeta();
  try {
    await enforceRateLimit(`event:${ip ?? "unknown"}`, 5, 600);
    const session = await getSession();
    await registerForEvent({ ...parsed.data, userId: session?.id ?? null });
    return ok(undefined);
  } catch (error) {
    return fail(error);
  }
}
