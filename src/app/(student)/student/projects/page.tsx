import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, ArrowRight } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { projectsForStudent } from "@/server/services/projects";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { enumLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Projects" };
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { studentId } = await requireStudentProfile();
  const projects = await projectsForStudent(studentId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Projects" description="Real work, reviewed against a rubric. Approved projects go straight into your portfolio." />
      {projects.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const done = p.latest?.milestonesDone.length ?? 0;
            return (
              <Link key={p.id} href={`/student/projects/${p.id}`} className="surface surface-hover flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-3-soft text-accent-3"><FolderKanban className="size-5" /></span>
                  <Badge variant={statusVariant(p.latest?.status ?? "NOT_STARTED")}>{p.latest ? enumLabel(p.latest.status) : "Not started"}</Badge>
                </div>
                <div>
                  <h2 className="text-h4">{p.title}</h2>
                  <p className="text-caption text-fg-muted">{p.course.title}{p.deadline ? ` · deadline ${formatDate(p.deadline)}` : ""}</p>
                </div>
                {p.overview ? <p className="text-body-sm line-clamp-2 text-fg-muted">{p.overview}</p> : null}
                {p.milestones.length ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-caption text-fg-muted"><span>Milestones</span><span>{done}/{p.milestones.length}</span></div>
                    <Progress value={(done / p.milestones.length) * 100} size="sm" tone={p.latest?.status === "APPROVED" ? "success" : "accent"} />
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 4).map((s) => <Badge key={s}>{s}</Badge>)}
                  <ArrowRight className="ms-auto size-4 self-center text-fg-subtle rtl:rotate-180" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<FolderKanban />} title="Projects will appear here as you progress." description="Each course includes at least one real-world project." />
      )}
    </div>
  );
}
