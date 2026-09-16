import type { Metadata } from "next";
import { Video, PlayCircle, Sparkles } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { liveClassesForStudent } from "@/server/services/live-classes";
import { PageHeader } from "@/components/layout/page-header";
import { Badge, statusVariant } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { JoinLiveButton } from "@/components/lms/join-live-button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { enumLabel, epochMs, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Live classes" };
export const dynamic = "force-dynamic";

export default async function LiveClassesPage() {
  const { studentId } = await requireStudentProfile();
  const classes = await liveClassesForStudent(studentId);
  const now = epochMs();
  const upcoming = classes.filter((c) => c.status !== "CANCELLED" && c.endsAt.getTime() >= now - 3600000 && c.status !== "COMPLETED");
  const past = classes.filter((c) => !upcoming.includes(c)).reverse();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Live classes" description="Join sessions, catch up on recordings and read the AI summary if you missed one." />
      <section className="flex flex-col gap-3">
        <h2 className="text-label text-fg-subtle">Upcoming</h2>
        {upcoming.length ? (
          <ul className="surface divide-y divide-border">
            {upcoming.map((c) => {
              const startsIn = c.startsAt.getTime() - now;
              const joinable = startsIn <= 15 * 60 * 1000 && c.endsAt.getTime() >= now;
              return (
                <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent"><Video className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="text-caption text-fg-muted">{c.course.title}{c.batch ? ` · ${c.batch.name}` : ""} · {formatDateTime(c.startsAt)} – {formatDateTime(c.endsAt).split(", ").pop()}{c.host ? ` · ${c.host.name}` : ""}</p>
                  </div>
                  <Badge variant={statusVariant(c.status)}>{c.status === "LIVE" ? "Live now" : enumLabel(c.status)}</Badge>
                  {joinable ? <JoinLiveButton liveClassId={c.id} size="sm" /> : <span className="text-caption text-fg-subtle">Join opens 15 min before</span>}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState compact icon={<Video />} title="No upcoming live classes." description="Your instructor will schedule sessions for your batch." />
        )}
      </section>
      {past.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-label text-fg-subtle">Past sessions</h2>
          <Accordion type="multiple" className="surface divide-y divide-border px-4">
            {past.map((c) => (
              <AccordionItem key={c.id} value={c.id}>
                <AccordionTrigger>
                  <span className="flex min-w-0 flex-1 items-center gap-3 pe-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{c.title}</span>
                      <span className="block text-caption font-normal text-fg-muted">{c.course.title} · {formatDateTime(c.startsAt)}</span>
                    </span>
                    {c.attendance.length ? <Badge variant="success">Attended</Badge> : c.status === "CANCELLED" ? <Badge variant="danger">Cancelled</Badge> : <Badge>Missed</Badge>}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-3">
                  {c.recordings.length ? (
                    <div className="flex flex-wrap gap-2">
                      {c.recordings.map((r) => (
                        <a key={r.id} href={r.media?.url ?? r.url ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm hover:border-accent hover:text-accent">
                          <PlayCircle className="size-4" /> Watch recording
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-caption text-fg-subtle">No recording was added for this session.</p>
                  )}
                  {c.aiSummary ? (
                    <div className="rounded-lg bg-bg-subtle p-3">
                      <p className="mb-1 inline-flex items-center gap-1.5 text-label text-fg-subtle"><Sparkles className="size-3.5 text-accent" /> AI summary</p>
                      <p className="whitespace-pre-wrap text-body-sm">{c.aiSummary}</p>
                    </div>
                  ) : null}
                  {c.notes ? <p className="whitespace-pre-wrap text-body-sm text-fg-muted">{c.notes}</p> : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}
    </div>
  );
}
