import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, Clock, FileText } from "lucide-react";
import { prisma } from "@/server/db/prisma";
import { getSession } from "@/server/auth/session";
import { PageHero } from "@/components/marketing/page-hero";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Timeline } from "@/components/ui/timeline";
import { enumLabel, formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Application status", robots: { index: false } };

const FLOW = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "ENROLLED"] as const;

export default async function ApplicationStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  const app = await prisma.application.findUnique({ where: { id }, include: { course: { select: { title: true, slug: true } }, preferredBatch: { select: { name: true, startDate: true } }, documents: { include: { media: { select: { fileName: true } } } } } });
  if (!app) notFound();
  const personal = app.personal as { email: string; firstName: string; lastName: string };
  // Owner check: signed-in applicant, or a guest whose session email isn't available → show a minimal, non-sensitive view.
  const isOwner = !!session && (app.applicantUserId === session.id || session.email.toLowerCase() === personal.email.toLowerCase());
  const stageIndex = app.status === "REJECTED" || app.status === "WAITLISTED" ? -1 : FLOW.indexOf(app.status as (typeof FLOW)[number]);

  return (
    <>
      <PageHero eyebrow="Application" title={isOwner ? `Hi ${personal.firstName}, here's where things stand.` : `Application ${app.number}`} description={app.course.title} crumbs={[{ label: "Admissions", href: "/admissions" }, { label: app.number }]}>
        <Badge variant={statusVariant(app.status)} className="px-3 py-1 text-sm">{enumLabel(app.status)}</Badge>
      </PageHero>
      <div className="container-x grid max-w-4xl gap-10 py-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {app.status === "DRAFT" ? (
            <div className="surface flex flex-col gap-3 p-6">
              <p className="text-h4">This application is still a draft.</p>
              <p className="text-body-sm text-fg-muted">Finish and submit it to start the review.</p>
              <Button asChild className="w-fit">
                <Link href={`/apply?course=${app.course.slug}`}>Continue application</Link>
              </Button>
            </div>
          ) : (
            <Timeline
              items={[
                { id: "submitted", title: "Submitted", description: app.submittedAt ? formatDateTime(app.submittedAt) : undefined, icon: <CheckCircle2 />, tone: "success" },
                { id: "review", title: "Under review", description: stageIndex >= 1 ? "A counsellor is reviewing your goals and background." : "Waiting for a counsellor.", icon: stageIndex >= 1 ? <CheckCircle2 /> : <Clock />, tone: stageIndex >= 1 ? "success" : "accent" },
                {
                  id: "decision",
                  title: app.status === "REJECTED" ? "Not approved this time" : app.status === "WAITLISTED" ? "Waitlisted" : "Approved",
                  description: app.decisionNote ?? (stageIndex >= 2 ? (app.reviewedAt ? formatDateTime(app.reviewedAt) : undefined) : "Usually within two working days."),
                  icon: app.status === "REJECTED" ? <Circle /> : stageIndex >= 2 ? <CheckCircle2 /> : <Circle />,
                  tone: app.status === "REJECTED" ? "danger" : app.status === "WAITLISTED" ? "warning" : stageIndex >= 2 ? "success" : "default",
                },
                { id: "enrolled", title: "Enrolled", description: stageIndex >= 3 ? "Your learning space is open." : "Once fees are confirmed, your seat is locked in.", icon: stageIndex >= 3 ? <CheckCircle2 /> : <Circle />, tone: stageIndex >= 3 ? "success" : "default" },
              ]}
            />
          )}
          {app.status === "ENROLLED" ? (
            <Button asChild size="lg" className="mt-8">
              <Link href={session ? "/student/dashboard" : "/sign-in"}>Open my learning space</Link>
            </Button>
          ) : null}
        </div>
        <aside className={cn("lg:col-span-5", !isOwner && "hidden")}>
          <div className="surface flex flex-col gap-4 p-6 text-body-sm">
            <div>
              <p className="text-label text-fg-subtle">Reference</p>
              <p className="font-mono text-fg">{app.number}</p>
            </div>
            <div>
              <p className="text-label text-fg-subtle">Preferred mode</p>
              <p className="text-fg">{enumLabel(app.preferredMode)}</p>
            </div>
            {app.preferredBatch ? (
              <div>
                <p className="text-label text-fg-subtle">Preferred batch</p>
                <p className="text-fg">{app.preferredBatch.name}</p>
              </div>
            ) : null}
            <div>
              <p className="text-label text-fg-subtle">Documents</p>
              {app.documents.length ? (
                <ul className="mt-1 flex flex-col gap-1">
                  {app.documents.map((d) => (
                    <li key={d.id} className="inline-flex items-center gap-1.5 text-fg">
                      <FileText className="size-3.5 text-fg-subtle" /> {enumLabel(d.kind)} · {d.media.fileName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-fg-muted">None attached yet — you can send them to your counsellor on WhatsApp.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
