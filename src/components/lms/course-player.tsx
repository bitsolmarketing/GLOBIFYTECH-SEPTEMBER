"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, Circle, PlayCircle, FileText, ListChecks, ClipboardList, FolderKanban, Video, Sparkles, StickyNote, Paperclip, MessagesSquare, PanelLeftClose, PanelLeftOpen, Bookmark, Trash2, Award, AlertTriangle, Lock, ArrowLeft } from "lucide-react";
import { cn, formatDuration, formatDateTime } from "@/lib/utils";
import { VideoPlayer } from "@/components/ui/video-player";
import { Button, IconButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toaster";
import { Avatar } from "@/components/ui/avatar";
import { AiChat } from "./ai-chat";
import { saveVideoProgressAction, completeLessonAction, startLessonAction, saveNoteAction, deleteNoteAction, addBookmarkAction, removeBookmarkAction } from "@/server/actions/student";
import { LogoMark } from "@/components/brand/logo";
import { motion, AnimatePresence } from "motion/react";

export interface PlayerLesson {
  id: string;
  title: string;
  type: string;
  content: string | null;
  objectives: string[];
  durationSeconds: number;
  videoUrl: string | null;
  resources: Array<{ id: string; title: string; type: string; url: string | null }>;
  quiz: { id: string; title: string; lastAttempt: { status: string; percent: number; passed: boolean } | null } | null;
  assignment: { id: string; title: string; dueAt: string | null; status: string | null } | null;
  project: { id: string; title: string; deadline: string | null; status: string | null } | null;
  liveClass: { id: string; title: string; startsAt: string; status: string } | null;
  completed: boolean;
  prevId: string | null;
  nextId: string | null;
  moduleTitle: string;
}

export interface CoursePlayerProps {
  course: { id: string; slug: string; title: string; instructor: { id: string; name: string; avatar?: { url: string } | null } | null };
  curriculum: Array<{ id: string; title: string; units: Array<{ id: string; title: string; lessons: Array<{ id: string; title: string; type: string; durationSeconds: number; status: string }> }> }>;
  lesson: PlayerLesson;
  progress: { percent: number; completed: number; total: number };
  startAt: number;
  notes: Array<{ id: string; body: string; timestampSeconds: number | null; createdAt: string }>;
  bookmarks: Array<{ id: string; timestampSeconds: number; label: string | null }>;
  discussions: Array<{ id: string; title: string; author: string; replies: number; isResolved: boolean; createdAt: string }>;
  completion: { complete: boolean; readiness: number; requirements: Array<{ key: string; label: string; required: boolean; met: boolean; detail: string }>; certificate: { id: string; certificateNumber: string } | null };
  aiEnabled: boolean;
  overdueInvoice: { id: string; number: string } | null;
  initialTab?: string;
}

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = { VIDEO: PlayCircle, TEXT: FileText, LIVE: Video, QUIZ: ListChecks, ASSIGNMENT: ClipboardList, PROJECT: FolderKanban, RESOURCE: Paperclip };

function Curriculum({ curriculum, currentId, courseId, onNavigate }: { curriculum: CoursePlayerProps["curriculum"]; currentId: string; courseId: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Curriculum" className="flex flex-col gap-4 p-3">
      {curriculum.map((m, mi) => (
        <div key={m.id}>
          <p className="mb-1 px-2 text-label text-fg-subtle">
            {String(mi + 1).padStart(2, "0")} · {m.title}
          </p>
          {m.units.map((u) => (
            <ul key={u.id} className="flex flex-col">
              {m.units.length > 1 ? <li className="px-2 py-1 text-caption text-fg-subtle">{u.title}</li> : null}
              {u.lessons.map((l) => {
                const Icon = typeIcon[l.type] ?? FileText;
                const active = l.id === currentId;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/student/course/${courseId}?lesson=${l.id}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn("flex items-center gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-bg-muted", active ? "bg-accent-soft text-accent" : "text-fg-muted")}
                    >
                      {l.status === "COMPLETED" ? <Check className="size-4 shrink-0 text-success" /> : l.status === "IN_PROGRESS" ? <Circle className="size-4 shrink-0 fill-accent/30 text-accent" /> : <Icon className="size-4 shrink-0" />}
                      <span className={cn("min-w-0 flex-1 truncate", active && "font-medium")}>{l.title}</span>
                      {l.durationSeconds ? <span className="text-caption tabular-nums text-fg-subtle">{formatDuration(l.durationSeconds)}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function CoursePlayer({ course, curriculum, lesson, progress, startAt, notes: initialNotes, bookmarks: initialBookmarks, discussions, completion, aiEnabled, overdueInvoice, initialTab }: CoursePlayerProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileCurriculum, setMobileCurriculum] = React.useState(false);
  const [completed, setCompleted] = React.useState(lesson.completed);
  const [pct, setPct] = React.useState(progress);
  const [notes, setNotes] = React.useState(initialNotes);
  const [bookmarks, setBookmarks] = React.useState(initialBookmarks);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [pending, start] = React.useTransition();
  const [celebrate, setCelebrate] = React.useState(false);
  const positionRef = React.useRef(startAt);
  const lastSaved = React.useRef(Date.now());
  const watchedRef = React.useRef(0);

  React.useEffect(() => {
    setCompleted(lesson.completed);
    setNotes(initialNotes);
    setBookmarks(initialBookmarks);
    positionRef.current = startAt;
    watchedRef.current = 0;
    void startLessonAction(lesson.id);
  }, [lesson.id, lesson.completed, initialNotes, initialBookmarks, startAt]);

  const markComplete = React.useCallback(() => {
    if (completed) return;
    start(async () => {
      const res = await completeLessonAction(lesson.id, course.id);
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      setCompleted(true);
      setPct({ percent: res.data.percent, completed: res.data.completed, total: res.data.total });
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1800);
    });
  }, [completed, lesson.id, course.id]);

  const onProgress = React.useCallback(
    (position: number, percent: number) => {
      const now = Date.now();
      const delta = Math.max(0, Math.min(15, Math.round((now - lastSaved.current) / 1000)));
      lastSaved.current = now;
      watchedRef.current += delta;
      positionRef.current = position;
      void saveVideoProgressAction({ lessonId: lesson.id, positionSeconds: position, percent, secondsWatched: delta });
      if (percent >= 90 && !completed) setCompleted(true), setPct((p) => ({ ...p, completed: p.completed + 1, percent: Math.min(100, ((p.completed + 1) / Math.max(1, p.total)) * 100) }));
    },
    [lesson.id, completed],
  );

  const addNote = () =>
    start(async () => {
      const res = await saveNoteAction({ lessonId: lesson.id, body: noteDraft, timestampSeconds: lesson.type === "VIDEO" ? Math.floor(positionRef.current) : null });
      if (!res.ok) { toast.error(res.error.message); return; }
      setNotes((n) => [{ id: res.data.id, body: noteDraft, timestampSeconds: lesson.type === "VIDEO" ? Math.floor(positionRef.current) : null, createdAt: new Date().toISOString() }, ...n]);
      setNoteDraft("");
    });

  const removeNote = (id: string) =>
    start(async () => {
      const res = await deleteNoteAction(id);
      if (res.ok) setNotes((n) => n.filter((x) => x.id !== id));
    });

  const bookmark = (seconds: number) =>
    start(async () => {
      const res = await addBookmarkAction({ lessonId: lesson.id, timestampSeconds: seconds });
      if (!res.ok) { toast.error(res.error.message); return; }
      setBookmarks((b) => [...b, { id: res.data.id, timestampSeconds: seconds, label: null }].sort((x, y) => x.timestampSeconds - y.timestampSeconds));
      toast.success(`Bookmarked at ${formatDuration(seconds)}`);
    });

  const Icon = typeIcon[lesson.type] ?? FileText;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-surface/90 px-3 backdrop-blur md:px-4">
        <IconButton label="Back to dashboard" size="sm" onClick={() => router.push("/student/dashboard")}>
          <ArrowLeft className="rtl:rotate-180" />
        </IconButton>
        <LogoMark size={22} />
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-medium">{course.title}</p>
        </div>
        <div className="ms-auto flex items-center gap-3">
          <div className="hidden w-48 items-center gap-2 md:flex">
            <Progress value={pct.percent} size="sm" tone={pct.percent >= 100 ? "success" : "gradient"} />
            <span className="text-caption tabular-nums text-fg-muted">{Math.round(pct.percent)}%</span>
          </div>
          <IconButton label="Curriculum" size="sm" className="lg:hidden" onClick={() => setMobileCurriculum(true)}>
            <PanelLeftOpen />
          </IconButton>
          <IconButton label={sidebarOpen ? "Hide curriculum" : "Show curriculum"} size="sm" className="hidden lg:inline-flex" onClick={() => setSidebarOpen((o) => !o)}>
            {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
          </IconButton>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Left: curriculum */}
        <aside className={cn("sticky top-14 hidden h-[calc(100vh-56px)] shrink-0 border-e border-border bg-surface transition-[width] duration-300 lg:block", sidebarOpen ? "w-80" : "w-0 overflow-hidden border-0")}>
          <ScrollArea className="h-full">
            <Curriculum curriculum={curriculum} currentId={lesson.id} courseId={course.id} />
          </ScrollArea>
        </aside>
        <Sheet open={mobileCurriculum} onOpenChange={setMobileCurriculum}>
          <SheetContent side="left" className="w-[88%] max-w-sm p-0">
            <SheetTitle className="sr-only">Curriculum</SheetTitle>
            <ScrollArea className="h-full">
              <Curriculum curriculum={curriculum} currentId={lesson.id} courseId={course.id} onNavigate={() => setMobileCurriculum(false)} />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Center + right */}
        <div className="grid min-w-0 flex-1 gap-6 p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="flex min-w-0 flex-col gap-6">
            {overdueInvoice ? (
              <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm">
                <AlertTriangle className="size-4 text-warning" />
                <span className="flex-1">Invoice {overdueInvoice.number} is overdue. Clear it to stay eligible for certification.</span>
                <Button asChild size="sm" variant="secondary"><Link href={`/student/payments/${overdueInvoice.id}`}>Pay now</Link></Button>
              </div>
            ) : null}

            {/* Media */}
            {lesson.type === "VIDEO" && lesson.videoUrl ? (
              <VideoPlayer sources={[{ src: lesson.videoUrl }]} startAt={startAt} onProgress={onProgress} onEnded={markComplete} onBookmark={bookmark} title={lesson.title} />
            ) : lesson.type === "LIVE" ? (
              <div className="surface flex flex-col items-start gap-3 p-6">
                <Video className="size-6 text-accent" />
                <p className="text-h4">Live session</p>
                {lesson.liveClass ? (
                  <>
                    <p className="text-body-sm text-fg-muted">{lesson.liveClass.title} · {formatDateTime(lesson.liveClass.startsAt)} · {lesson.liveClass.status.toLowerCase()}</p>
                    <Button asChild><Link href="/student/live-classes">Open live classes</Link></Button>
                  </>
                ) : (
                  <p className="text-body-sm text-fg-muted">The session will be scheduled by your instructor. You'll be notified.</p>
                )}
              </div>
            ) : lesson.type === "QUIZ" && lesson.quiz ? (
              <div className="surface flex flex-col items-start gap-3 p-6">
                <ListChecks className="size-6 text-accent" />
                <p className="text-h4">{lesson.quiz.title}</p>
                {lesson.quiz.lastAttempt ? <Badge variant={lesson.quiz.lastAttempt.passed ? "success" : "warning"}>Last attempt: {lesson.quiz.lastAttempt.percent}% · {lesson.quiz.lastAttempt.passed ? "Passed" : "Not passed"}</Badge> : null}
                <Button asChild><Link href={`/student/quizzes?start=${lesson.quiz.id}`}>{lesson.quiz.lastAttempt ? "Try again" : "Start quiz"}</Link></Button>
              </div>
            ) : lesson.type === "ASSIGNMENT" && lesson.assignment ? (
              <div className="surface flex flex-col items-start gap-3 p-6">
                <ClipboardList className="size-6 text-accent" />
                <p className="text-h4">{lesson.assignment.title}</p>
                <p className="text-body-sm text-fg-muted">{lesson.assignment.dueAt ? `Due ${formatDateTime(lesson.assignment.dueAt)}` : "No deadline"}{lesson.assignment.status ? ` · ${lesson.assignment.status.replace("_", " ").toLowerCase()}` : ""}</p>
                <Button asChild><Link href={`/student/assignments/${lesson.assignment.id}`}>Open assignment</Link></Button>
              </div>
            ) : lesson.type === "PROJECT" && lesson.project ? (
              <div className="surface flex flex-col items-start gap-3 p-6">
                <FolderKanban className="size-6 text-accent" />
                <p className="text-h4">{lesson.project.title}</p>
                <p className="text-body-sm text-fg-muted">{lesson.project.deadline ? `Deadline ${formatDateTime(lesson.project.deadline)}` : "No deadline"}{lesson.project.status ? ` · ${lesson.project.status.replace("_", " ").toLowerCase()}` : ""}</p>
                <Button asChild><Link href={`/student/projects/${lesson.project.id}`}>Open project</Link></Button>
              </div>
            ) : null}

            {/* Lesson header */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-caption text-fg-muted"><Icon className="size-3.5" /> {lesson.moduleTitle}</p>
                  <h1 className="text-h2">{lesson.title}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {celebrate ? (
                      <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-caption font-medium text-success">
                        Lesson complete
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                  {completed ? (
                    <Badge variant="success" className="px-3 py-1"><Check className="size-3.5" /> Completed</Badge>
                  ) : lesson.type !== "QUIZ" && lesson.type !== "ASSIGNMENT" && lesson.type !== "PROJECT" ? (
                    <Button onClick={markComplete} loading={pending} variant="secondary">
                      <Check /> Mark complete
                    </Button>
                  ) : null}
                </div>
              </div>
              {lesson.objectives.length ? (
                <ul className="flex flex-wrap gap-2">
                  {lesson.objectives.map((o) => (
                    <li key={o} className="rounded-full border border-border bg-bg-subtle px-3 py-1 text-caption text-fg-muted">{o}</li>
                  ))}
                </ul>
              ) : null}
            </div>

            {/* Below: info / resources / notes / discussion */}
            <Tabs defaultValue={initialTab === "resources" || initialTab === "notes" || initialTab === "discussion" ? initialTab : "about"}>
              <TabsList>
                <TabsTrigger value="about"><FileText /> Lesson</TabsTrigger>
                <TabsTrigger value="resources"><Paperclip /> Resources{lesson.resources.length ? ` (${lesson.resources.length})` : ""}</TabsTrigger>
                <TabsTrigger value="notes"><StickyNote /> Notes{notes.length ? ` (${notes.length})` : ""}</TabsTrigger>
                <TabsTrigger value="discussion"><MessagesSquare /> Discussion</TabsTrigger>
              </TabsList>
              <TabsContent value="about">
                {lesson.content ? <div className="prose-globify" dangerouslySetInnerHTML={{ __html: lesson.content }} /> : <p className="text-body-sm text-fg-muted">No additional notes for this lesson.</p>}
                {bookmarks.length ? (
                  <div className="mt-6">
                    <p className="text-label mb-2 text-fg-subtle">Bookmarks</p>
                    <ul className="flex flex-wrap gap-2">
                      {bookmarks.map((b) => (
                        <li key={b.id} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-caption">
                          <Bookmark className="size-3 text-accent" /> {formatDuration(b.timestampSeconds)}
                          <button type="button" onClick={() => start(async () => { await removeBookmarkAction(b.id); setBookmarks((x) => x.filter((y) => y.id !== b.id)); })} className="ms-1 text-fg-subtle hover:text-danger" aria-label="Remove bookmark">
                            <Trash2 className="size-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </TabsContent>
              <TabsContent value="resources">
                {lesson.resources.length ? (
                  <ul className="surface divide-y divide-border">
                    {lesson.resources.map((r) => (
                      <li key={r.id}>
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 hover:bg-bg-subtle">
                            <Paperclip className="size-4 text-fg-subtle" />
                            <span className="flex-1 text-sm font-medium">{r.title}</span>
                            <Badge>{r.type.toLowerCase()}</Badge>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-4 text-fg-muted"><Lock className="size-4" /> {r.title}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-fg-muted">No resources attached to this lesson.</p>
                )}
              </TabsContent>
              <TabsContent value="notes" className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder={lesson.type === "VIDEO" ? "Write a note — it's timestamped to where you are in the video." : "Write a note for this lesson."} rows={3} />
                  <div className="flex justify-end">
                    <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()} loading={pending}>Save note</Button>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {notes.map((n) => (
                    <li key={n.id} className="surface flex gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap text-sm">{n.body}</p>
                        <p className="mt-1 text-caption text-fg-subtle">{n.timestampSeconds != null ? `at ${formatDuration(n.timestampSeconds)} · ` : ""}{formatDateTime(n.createdAt)}</p>
                      </div>
                      <IconButton label="Delete note" size="sm" onClick={() => removeNote(n.id)}><Trash2 /></IconButton>
                    </li>
                  ))}
                  {!notes.length ? <p className="text-body-sm text-fg-muted">No notes yet. Notes are private to you.</p> : null}
                </ul>
              </TabsContent>
              <TabsContent value="discussion" className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-body-sm text-fg-muted">Questions and discussion for this lesson.</p>
                  <Button asChild size="sm" variant="secondary"><Link href={`/student/community?new=1&lessonId=${lesson.id}&courseId=${course.id}`}>Ask a question</Link></Button>
                </div>
                {discussions.length ? (
                  <ul className="surface divide-y divide-border">
                    {discussions.map((d) => (
                      <li key={d.id}>
                        <Link href={`/student/community/${d.id}`} className="flex items-center gap-3 p-4 hover:bg-bg-subtle">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.title}</p>
                            <p className="text-caption text-fg-muted">{d.author} · {d.replies} replies</p>
                          </div>
                          {d.isResolved ? <Badge variant="success">Resolved</Badge> : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-fg-muted">No questions yet. Be the first to ask.</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Prev / next */}
            <div className="flex items-center justify-between border-t border-border pt-4">
              {lesson.prevId ? (
                <Button asChild variant="ghost"><Link href={`/student/course/${course.id}?lesson=${lesson.prevId}`}><ChevronLeft className="rtl:rotate-180" /> Previous</Link></Button>
              ) : <span />}
              {lesson.nextId ? (
                <Button asChild><Link href={`/student/course/${course.id}?lesson=${lesson.nextId}`}>Next lesson <ChevronRight className="rtl:rotate-180" /></Link></Button>
              ) : (
                <Button asChild variant="secondary"><Link href="/student/certificates">Finish course</Link></Button>
              )}
            </div>
          </main>

          {/* Right rail */}
          <aside className="flex flex-col gap-4">
            <div className="surface sticky top-20 flex h-[min(70vh,640px)] flex-col overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Sparkles className="size-4 text-accent" />
                <p className="text-sm font-medium">Globify AI</p>
                <span className="ms-auto text-caption text-fg-subtle">knows this lesson</span>
              </div>
              <AiChat endpoint="/api/v1/ai/tutor" context={{ courseId: course.id, lessonId: lesson.id }} enabled={aiEnabled} suggestions={["Explain this lesson simply", "Give me an example", "Quiz me on this", "Where am I weak?"]} compact />
            </div>
            <div className="surface flex flex-col gap-3 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Completion</p>
                <span className="text-caption tabular-nums text-fg-muted">{completion.readiness}% ready</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {completion.requirements.filter((r) => r.required).map((r) => (
                  <li key={r.key} className="flex items-start gap-2 text-caption">
                    {r.met ? <Check className="mt-0.5 size-3.5 text-success" /> : <Circle className="mt-0.5 size-3.5 text-fg-subtle" />}
                    <span className={cn(r.met ? "text-fg" : "text-fg-muted")}>{r.label} <span className="text-fg-subtle">· {r.detail}</span></span>
                  </li>
                ))}
              </ul>
              {completion.certificate ? (
                <Button asChild size="sm" variant="secondary"><Link href="/student/certificates"><Award /> View certificate {completion.certificate.certificateNumber}</Link></Button>
              ) : null}
            </div>
            {course.instructor ? (
              <div className="surface flex items-center gap-3 p-4">
                <Avatar name={course.instructor.name} src={course.instructor.avatar?.url} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{course.instructor.name}</p>
                  <p className="text-caption text-fg-muted">Instructor</p>
                </div>
                <Button asChild size="sm" variant="ghost"><Link href={`/student/messages?to=${course.instructor.id}`}>Message</Link></Button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}
