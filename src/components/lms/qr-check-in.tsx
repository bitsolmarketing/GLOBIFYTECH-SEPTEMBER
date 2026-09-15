"use client";

import * as React from "react";
import { QrCode, CheckCircle2 } from "lucide-react";
import { qrCheckInAction } from "@/server/actions/student";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

/**
 * Students paste/scan the token shown by the instructor. On phones with a
 * camera, the browser's native QR reader (via the camera app) opens the link
 * /student/attendance?token=… which pre-fills this field.
 */
export function QrCheckIn({ initialToken }: { initialToken?: string }) {
  const [token, setToken] = React.useState(initialToken ?? "");
  const [done, setDone] = React.useState(false);
  const [pending, start] = React.useTransition();
  const submit = React.useCallback(
    () =>
      start(async () => {
        const res = await qrCheckInAction(token.trim());
        if (!res.ok) { toast.error(res.error.message); return; }
        setDone(true);
        toast.success("Marked present. Have a great class.");
      }),
    [token],
  );
  React.useEffect(() => {
    if (initialToken) submit();
  }, [initialToken, submit]);
  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/30 bg-success-soft p-4 text-sm text-success">
        <CheckCircle2 className="size-5" /> You're marked present for today's session.
      </div>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex flex-col gap-3 sm:flex-row"
    >
      <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Scan the class QR or paste the code" leading={<QrCode />} aria-label="Attendance code" />
      <Button type="submit" loading={pending} disabled={!token.trim()}>
        Check in
      </Button>
    </form>
  );
}
