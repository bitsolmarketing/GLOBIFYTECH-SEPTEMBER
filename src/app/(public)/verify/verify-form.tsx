"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function VerifyForm({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [value, setValue] = React.useState(defaultValue);
  const [pending, start] = React.useTransition();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const id = value.trim().toUpperCase();
        if (!id) return;
        start(() => router.push(`/verify/${encodeURIComponent(id)}`));
      }}
    >
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Certificate ID, e.g. GT-2026-000123" leading={<Search />} className="h-12 font-mono uppercase" aria-label="Certificate ID" autoCapitalize="characters" />
      <Button type="submit" size="lg" loading={pending}>
        Verify
      </Button>
    </form>
  );
}
