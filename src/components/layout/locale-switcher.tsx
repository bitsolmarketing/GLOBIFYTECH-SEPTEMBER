"use client";

import * as React from "react";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { LOCALES, LOCALE_LABELS } from "@/i18n/config";
import { setLocale } from "@/server/actions/preferences";
import { IconButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function LocaleSwitcher({ label = "Language" }: { label?: string }) {
  const locale = useLocale();
  const [pending, start] = React.useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={label} size="sm" loading={pending}>
          <Languages />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={locale} onValueChange={(v) => start(() => void setLocale(v))}>
          {LOCALES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l}>
              {LOCALE_LABELS[l]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
