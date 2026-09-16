"use client";

import { useRouter } from "next/navigation";
import { SimpleSelect } from "@/components/ui/select";

export function SimpleSelectLink({ base, courses, active }: { base: string; courses: Array<{ id: string; title: string }>; active?: string }) {
  const router = useRouter();
  return (
    <div className="w-full max-w-xs">
      <SimpleSelect value={active ?? "__all"} onValueChange={(v) => router.push(v === "__all" ? base : `${base}?course=${v}`)} options={[{ value: "__all", label: "All courses" }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} size="sm" />
    </div>
  );
}
