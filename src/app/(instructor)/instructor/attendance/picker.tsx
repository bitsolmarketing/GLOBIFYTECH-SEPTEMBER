"use client";

import { useRouter } from "next/navigation";
import { SimpleSelect } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export function AttendancePicker({ batches, batchId, date }: { batches: Array<{ id: string; label: string }>; batchId: string; date: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="sm:w-96">
        <SimpleSelect value={batchId} onValueChange={(v) => router.push(`/instructor/attendance?batch=${v}&date=${date}`)} options={batches.map((b) => ({ value: b.id, label: b.label }))} />
      </div>
      <Input type="date" value={date} onChange={(e) => router.push(`/instructor/attendance?batch=${batchId}&date=${e.target.value}`)} className="sm:w-48" aria-label="Session date" />
    </div>
  );
}
