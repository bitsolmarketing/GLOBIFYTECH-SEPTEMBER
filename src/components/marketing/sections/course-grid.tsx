import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseCard } from "@/components/lms/course-card";
import type { CourseCardData } from "@/server/services/courses";
import { RevealGroup, RevealItem } from "../motion";
import { SectionIntro } from "./features";

export function CourseGridSection({ data, courses }: { data: { title?: string; subtitle?: string; ctaLabel?: string }; courses: CourseCardData[] }) {
  if (!courses.length) return null;
  return (
    <section className="py-20 md:py-28">
      <div className="container-x">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <SectionIntro eyebrow="Courses" title={data.title ?? "Featured courses"} subtitle={data.subtitle} className="mb-0 md:mb-0" />
          <Button asChild variant="ghost" className="mb-2 hidden md:inline-flex">
            <Link href="/courses">
              {data.ctaLabel ?? "View all courses"} <ArrowRight className="rtl:rotate-180" />
            </Link>
          </Button>
        </div>
        <RevealGroup className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <RevealItem key={c.id}>
              <CourseCard course={c} className="h-full" />
            </RevealItem>
          ))}
        </RevealGroup>
        <div className="mt-8 md:hidden">
          <Button asChild variant="secondary" className="w-full">
            <Link href="/courses">{data.ctaLabel ?? "View all courses"}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
