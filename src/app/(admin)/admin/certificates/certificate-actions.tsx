"use client";

import * as React from "react";
import { Ban, RotateCcw, Award } from "lucide-react";
import { revokeCertificateAction, reinstateCertificateAction, issueCertificateAction } from "@/server/actions/admin";
import { ConfirmAction, ActionButton } from "@/components/admin/confirm-action";
import { AdminTable, Row, Cell } from "@/components/admin/table";
import { formatDate } from "@/lib/utils";

export function RevokeCertificate({ id, number }: { id: string; number: string }) {
  return <ConfirmAction title={`Revoke ${number}?`} description="The public verification page will show the certificate as revoked. This is recorded in the audit log." confirmLabel="Revoke" variant="ghost" reason={{ label: "Reason for revoking", required: true }} action={(reason) => revokeCertificateAction(id, reason)} successMessage="Certificate revoked."><Ban /></ConfirmAction>;
}

export function ReinstateCertificate({ id }: { id: string }) {
  return <ActionButton action={() => reinstateCertificateAction(id)} successMessage="Certificate reinstated." variant="ghost" size="sm"><RotateCcw /></ActionButton>;
}

export function IssuePendingCertificates({ items }: { items: Array<{ enrollmentId: string; student: string; studentNumber: string; course: string; completedAt: string | null }> }) {
  const [open, setOpen] = React.useState(false);
  return (
    <section className="rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
      <button type="button" className="flex w-full items-center justify-between text-start" onClick={() => setOpen(!open)}>
        <span className="text-sm"><Award className="me-1 inline size-4 text-accent" /><span className="font-medium">{items.length} completed enrollment{items.length > 1 ? "s" : ""} without a certificate.</span></span>
        <span className="text-caption text-accent">{open ? "Hide" : "Review"}</span>
      </button>
      {open ? (
        <div className="mt-3">
          <AdminTable headers={["Student", "Course", "Completed", { label: "", align: "end" }]} dense>
            {items.map((i) => (
              <Row key={i.enrollmentId}>
                <Cell className="font-medium">{i.student}<span className="block text-caption text-fg-subtle">{i.studentNumber}</span></Cell>
                <Cell muted>{i.course}</Cell>
                <Cell className="text-caption text-fg-muted">{i.completedAt ? formatDate(new Date(i.completedAt)) : "—"}</Cell>
                <Cell align="end"><ActionButton action={() => issueCertificateAction(i.enrollmentId)} successMessage="Certificate issued." size="sm"><Award /> Issue</ActionButton></Cell>
              </Row>
            ))}
          </AdminTable>
        </div>
      ) : null}
    </section>
  );
}
