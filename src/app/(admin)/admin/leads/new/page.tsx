import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/session";
import { leadFormOptions } from "@/server/queries/lead-options";
import { PageHeader } from "@/components/layout/page-header";
import { LeadForm } from "@/components/admin/lead-form";

export const metadata: Metadata = { title: "New lead" };
export const dynamic = "force-dynamic";

export default async function NewLeadPage() {
  const user = await requirePermission("crm.leads.create");
  const options = await leadFormOptions();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader title="New lead" description="Walk-ins, phone calls and referrals. Website and WhatsApp leads are captured automatically." breadcrumbs={[{ label: "Leads", href: "/admin/leads" }, { label: "New" }]} />
      <div className="surface p-6"><LeadForm {...options} initial={{ counsellorId: options.counsellors.some((c) => c.id === user.id) ? user.id : "" }} /></div>
    </div>
  );
}
