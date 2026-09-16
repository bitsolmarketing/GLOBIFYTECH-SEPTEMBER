"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function ThemeToggle({ labels }: { labels?: { light: string; dark: string; system: string; toggle: string } }) {
  const { theme, setTheme } = useTheme();
  // False while rendering on the server, true once hydrated, so the icon
  // matches the resolved theme without a hydration mismatch.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const l = labels ?? { light: "Light", dark: "Dark", system: "System", toggle: "Theme" };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={l.toggle} size="sm">
          {mounted && theme === "dark" ? <Moon /> : mounted && theme === "light" ? <Sun /> : <Monitor />}
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          <DropdownMenuRadioItem value="light">
            <Sun /> {l.light}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon /> {l.dark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor /> {l.system}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
