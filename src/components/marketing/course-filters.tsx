"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface FacetOption {
  value: string;
  label: string;
}

export interface CourseFiltersProps {
  categories: FacetOption[];
  skills: FacetOption[];
  instructors: FacetOption[];
  labels: { search: string; category: string; skill: string; difficulty: string; duration: string; mode: string; instructor: string; clear: string; filter: string; results: string };
}

const LEVELS = [{ value: "BEGINNER", label: "Beginner" }, { value: "INTERMEDIATE", label: "Intermediate" }, { value: "ADVANCED", label: "Advanced" }];
const DURATIONS = [{ value: "short", label: "Up to 4 weeks" }, { value: "medium", label: "1–3 months" }, { value: "long", label: "3+ months" }];
const MODES = [{ value: "ON_CAMPUS", label: "On campus" }, { value: "LIVE_ONLINE", label: "Live online" }, { value: "HYBRID", label: "Hybrid" }, { value: "SELF_PACED", label: "Self-paced" }];
const SORTS = [{ value: "popular", label: "Most popular" }, { value: "newest", label: "Newest" }, { value: "rating", label: "Top rated" }, { value: "price-asc", label: "Price: low to high" }, { value: "price-desc", label: "Price: high to low" }];

export function CourseFilters({ categories, skills, instructors, labels }: CourseFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState(params.get("q") ?? "");
  const [pending, start] = React.useTransition();

  const set = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  React.useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") !== q) set("q", q || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = ["category", "skill", "level", "duration", "mode", "instructor"].filter((k) => params.get(k));
  const clear = () => {
    setQ("");
    start(() => router.push(pathname, { scroll: false }));
  };

  const selects = (
    <>
      <SimpleSelect placeholder={labels.category} value={params.get("category") ?? ""} onValueChange={(v) => set("category", v || null)} options={[{ value: "__all", label: `All · ${labels.category}` }, ...categories]} size="sm" />
      <SimpleSelect placeholder={labels.difficulty} value={params.get("level") ?? ""} onValueChange={(v) => set("level", v === "__all" ? null : v)} options={[{ value: "__all", label: `All · ${labels.difficulty}` }, ...LEVELS]} size="sm" />
      <SimpleSelect placeholder={labels.duration} value={params.get("duration") ?? ""} onValueChange={(v) => set("duration", v === "__all" ? null : v)} options={[{ value: "__all", label: `All · ${labels.duration}` }, ...DURATIONS]} size="sm" />
      <SimpleSelect placeholder={labels.mode} value={params.get("mode") ?? ""} onValueChange={(v) => set("mode", v === "__all" ? null : v)} options={[{ value: "__all", label: `All · ${labels.mode}` }, ...MODES]} size="sm" />
      {skills.length ? <SimpleSelect placeholder={labels.skill} value={params.get("skill") ?? ""} onValueChange={(v) => set("skill", v === "__all" ? null : v)} options={[{ value: "__all", label: `All · ${labels.skill}` }, ...skills]} size="sm" /> : null}
      {instructors.length ? <SimpleSelect placeholder={labels.instructor} value={params.get("instructor") ?? ""} onValueChange={(v) => set("instructor", v === "__all" ? null : v)} options={[{ value: "__all", label: `All · ${labels.instructor}` }, ...instructors]} size="sm" /> : null}
    </>
  );

  return (
    <div className={cn("flex flex-col gap-3", pending && "opacity-70")}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.search} leading={<Search />} className="h-12 rounded-lg text-base" aria-label={labels.search} />
        </div>
        <SimpleSelect value={params.get("sort") ?? "popular"} onValueChange={(v) => set("sort", v === "popular" ? null : v)} options={SORTS} className="hidden w-48 md:flex" />
        <Button variant="secondary" size="lg" className="md:hidden" onClick={() => setOpen(true)}>
          <SlidersHorizontal /> {labels.filter}
          {active.length ? <span className="rounded-full bg-accent px-1.5 text-[11px] text-white">{active.length}</span> : null}
        </Button>
      </div>
      <div className="hidden flex-wrap items-center gap-2 md:flex [&>button]:w-auto [&>button]:min-w-36">
        {selects}
        {active.length || q ? (
          <Button variant="ghost" size="sm" onClick={clear}>
            <X /> {labels.clear}
          </Button>
        ) : null}
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="gap-3">
          <SheetTitle>{labels.filter}</SheetTitle>
          <div className="grid gap-3">{selects}</div>
          <SimpleSelect value={params.get("sort") ?? "popular"} onValueChange={(v) => set("sort", v === "popular" ? null : v)} options={SORTS} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={clear}>
              {labels.clear}
            </Button>
            <Button className="flex-1" onClick={() => setOpen(false)}>
              {labels.results}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
