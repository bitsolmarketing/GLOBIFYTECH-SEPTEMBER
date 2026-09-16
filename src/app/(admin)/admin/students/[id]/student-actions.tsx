"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, UserX, UserCheck, Shield, GraduationCap, Award } from "lucide-react";
import { setUserStatusAction, setUserRolesAction, issueCertificateAction } from "@/server/actions/admin";
import { ConfirmAction, ActionButton } from "@/components/admin/confirm-action";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/toaster";
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from "@/lib/rbac";

export function StudentActions({ userId, studentId, status, roles, canSuspend, canManageRoles, canEnroll }: { userId: string; studentId: string; status: string; roles: string[]; canSuspend: boolean; canManageRoles: boolean; canEnroll: boolean }) {
  const router = useRouter();
  const [rolesOpen, setRolesOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<RoleKey[]>(roles as RoleKey[]);
  const [pending, start] = React.useTransition();
  return (
    <div className="flex items-center gap-2">
      {canEnroll ? <Button asChild size="sm"><Link href={`/admin/enrollments?student=${studentId}&new=1`}><GraduationCap /> Enroll</Link></Button> : null}
      {canSuspend ? (
        status === "SUSPENDED" ? (
          <ActionButton action={() => setUserStatusAction(userId, "ACTIVE")} successMessage="Account reactivated." variant="outline"><UserCheck /> Reactivate</ActionButton>
        ) : (
          <ConfirmAction title="Suspend this student?" description="They will be signed out everywhere and cannot sign in until reactivated. Enrollments and records are kept." confirmLabel="Suspend" variant="danger" action={() => setUserStatusAction(userId, "SUSPENDED")} successMessage="Account suspended."><UserX /> Suspend</ConfirmAction>
        )
      ) : null}
      {canManageRoles ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label="More"><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setRolesOpen(true)}><Shield /> Manage roles</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href={`/admin/audit-logs?q=${userId}`}>View audit trail</Link></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Roles</DialogTitle><DialogDescription>Roles decide which surfaces and actions this account can use. Changes sign the user out so the new roles take effect.</DialogDescription></DialogHeader>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_KEYS.filter((r) => r !== "GUEST").map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <Checkbox checked={selected.includes(r)} onCheckedChange={(v) => setSelected(v ? [...selected, r] : selected.filter((x) => x !== r))} />
                {ROLE_LABELS[r]}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRolesOpen(false)}>Cancel</Button>
            <Button loading={pending} onClick={() => start(async () => { const res = await setUserRolesAction(userId, selected); if (!res.ok) { toast.error(res.error.message); return; } toast.success("Roles updated."); setRolesOpen(false); router.refresh(); })}>Save roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function IssueCertificateButton({ enrollmentId }: { enrollmentId: string }) {
  return <ConfirmAction title="Issue certificate?" description="A certificate PDF with a public verification code will be generated and the student notified." confirmLabel="Issue" action={() => issueCertificateAction(enrollmentId)} successMessage="Certificate issued." size="sm" variant="ghost"><Award /> Issue</ConfirmAction>;
}
