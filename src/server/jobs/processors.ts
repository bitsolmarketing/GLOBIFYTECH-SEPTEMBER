import "server-only";
import type { JobPayloads } from "./index";
import { emailProvider } from "@/server/providers/email";
import { whatsappProvider } from "@/server/providers/whatsapp";
import { smsProvider } from "@/server/providers/sms";
import { dispatchNotification } from "@/server/services/notifications";
import { renderAndStoreCertificate } from "@/server/services/certificates";
import { renderAndStoreInvoice, runPaymentReminders } from "@/server/services/finance";
import { computeAllRisk, computeRiskForEnrollment } from "@/server/services/risk";
import { summarizeLiveClass } from "@/server/ai/summaries";
import { sendUpcomingClassReminders } from "@/server/services/live-classes";
import { publishScheduledContent } from "@/server/services/cms";
import { uncontactedLeadsDigest } from "@/server/services/crm";
import { prisma } from "@/server/db/prisma";
import { log } from "@/server/log";

type Processor<N extends keyof JobPayloads> = (payload: JobPayloads[N]) => Promise<void>;

export const processors: { [N in keyof JobPayloads]: Processor<N> } = {
  "email.send": async (p) => {
    await emailProvider().send(p);
  },
  "whatsapp.send": async (p) => {
    await whatsappProvider().send(p);
  },
  "sms.send": async (p) => {
    await smsProvider().send(p.to, p.text);
  },
  "notification.dispatch": async (p) => {
    if (p.notificationId) await dispatchNotification(p.notificationId);
  },
  "certificate.render": async (p) => {
    await renderAndStoreCertificate(p.certificateId);
  },
  "invoice.render": async (p) => {
    await renderAndStoreInvoice(p.invoiceId);
  },
  "risk.compute": async (p) => {
    if (p.all || !p.studentId) await computeAllRisk();
    else {
      const enrollments = await prisma.enrollment.findMany({ where: { studentId: p.studentId, status: "ACTIVE" }, select: { id: true } });
      for (const e of enrollments) await computeRiskForEnrollment(e.id);
    }
  },
  "liveclass.summarize": async (p) => {
    await summarizeLiveClass(p.liveClassId);
  },
  /** Daily housekeeping — schedule via cron (`0 6 * * *`) hitting /api/internal/cron or the worker's repeatable job. */
  "analytics.daily": async () => {
    const results = await Promise.allSettled([runPaymentReminders(), computeAllRisk(), sendUpcomingClassReminders(), publishScheduledContent(), uncontactedLeadsDigest()]);
    results.forEach((r, i) => r.status === "rejected" && log.error("daily task failed", { index: i, error: String(r.reason) }));
  },
  "backup.heartbeat": async (p) => {
    await prisma.setting.upsert({ where: { key: "backup.lastHeartbeat" }, update: { value: { at: new Date().toISOString(), source: p.source } }, create: { key: "backup.lastHeartbeat", group: "backup", value: { at: new Date().toISOString(), source: p.source } } });
  },
};
