"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { applicationSchema, type ApplicationInput } from "@/lib/validation/crm";

type ApplyFormValues = z.input<typeof applicationSchema>;
import { submitApplicationAction } from "@/server/actions/applications";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SimpleSelect } from "@/components/ui/select";
import { RadioGroup, RadioCard } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUploader, type UploadedFile } from "@/components/ui/file-uploader";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toaster";
import { cn, formatDate } from "@/lib/utils";

export interface ApplyCourseOption {
  id: string;
  slug: string;
  title: string;
  batches: Array<{ id: string; code: string; name: string; startDate: string; mode: string; seatsLeft: number }>;
}

const STEPS = ["Course", "Personal", "Education", "Goals", "Documents", "Review"] as const;

export function ApplyForm({ courses, initialCourseSlug, signedIn, defaults }: { courses: ApplyCourseOption[]; initialCourseSlug?: string; signedIn: boolean; defaults?: { firstName?: string; lastName?: string; email?: string; phone?: string } }) {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [files, setFiles] = React.useState<Record<string, UploadedFile[]>>({});
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<{ id: string; number: string } | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const initialCourse = courses.find((c) => c.slug === initialCourseSlug) ?? courses[0];

  const form = useForm<ApplyFormValues, unknown, ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      courseId: initialCourse?.id ?? "",
      preferredMode: "HYBRID",
      preferredBatchId: null,
      personal: { firstName: defaults?.firstName ?? "", lastName: defaults?.lastName ?? "", email: defaults?.email ?? "", phone: defaults?.phone ?? "", whatsapp: "", city: "", dateOfBirth: "", gender: undefined, address: "" },
      education: [{ level: "", institution: "", field: "", year: "" }],
      experience: [],
      goals: "",
      documents: [],
      acceptTerms: false as never,
    },
    mode: "onTouched",
  });
  const education = useFieldArray({ control: form.control, name: "education" });
  const experience = useFieldArray({ control: form.control, name: "experience" });
  const courseId = form.watch("courseId");
  const course = courses.find((c) => c.id === courseId);
  const values = form.watch();

  const stepFields: Array<Array<keyof ApplyFormValues | `personal.${string}` | "education" | "goals" | "documents" | "acceptTerms">> = [
    ["courseId", "preferredMode"],
    ["personal.firstName", "personal.lastName", "personal.email", "personal.phone", "personal.city"],
    ["education"],
    ["goals"],
    ["documents"],
    ["acceptTerms"],
  ];

  const next = async () => {
    const valid = await form.trigger(stepFields[step] as never);
    if (valid) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const submit = (asDraft: boolean) =>
    form.handleSubmit(
      (data) =>
        start(async () => {
          setServerError(null);
          const docs = Object.entries(files).flatMap(([kind, list]) => list.map((f) => ({ kind: kind as "CNIC" | "TRANSCRIPT" | "PHOTO" | "CV" | "OTHER", mediaId: f.mediaId })));
          const res = await submitApplicationAction({ ...data, documents: docs }, { submit: !asDraft });
          if (!res.ok) {
            setServerError(res.error.message);
            if (res.error.fields) {
              for (const [k, msgs] of Object.entries(res.error.fields)) form.setError(k as never, { message: msgs[0] });
              setStep(0);
            }
            return;
          }
          if (asDraft) {
            toast.success("Draft saved. Sign in any time to finish it.");
            router.push(`/apply/${res.data.id}`);
            return;
          }
          setResult(res.data);
        }),
      () => toast.error("Please fix the highlighted fields."),
    )();

  if (result) {
    return (
      <div className="surface flex flex-col items-center gap-4 p-10 text-center">
        <CheckCircle2 className="size-12 text-success" />
        <h2 className="text-h2">Application received.</h2>
        <p className="max-w-md text-body text-fg-muted">
          Your reference is <span className="font-mono font-medium text-fg">{result.number}</span>. Admissions reviews applications within two working days and will call or WhatsApp you.
        </p>
        <div className="mt-2 flex gap-3">
          <Button onClick={() => router.push(`/apply/${result.id}`)}>Track my application</Button>
          {!signedIn ? (
            <Button variant="secondary" onClick={() => router.push(`/sign-up?next=/apply/${result.id}`)}>
              Create an account
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-8">
        <ol className="flex items-center gap-2 overflow-x-auto pb-1 text-caption">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <button type="button" onClick={() => i < step && setStep(i)} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1", i === step ? "bg-accent text-white" : i < step ? "bg-success-soft text-success" : "bg-bg-muted text-fg-subtle")}>
                {i < step ? <Check className="size-3" /> : <span>{i + 1}</span>} {label}
              </button>
              {i < STEPS.length - 1 ? <span className="h-px w-4 bg-border" /> : null}
            </li>
          ))}
        </ol>

        {serverError ? <Alert variant="danger">{serverError}</Alert> : null}

        <div className="surface flex flex-col gap-6 p-6 md:p-8">
          {step === 0 ? (
            <>
              <FormField control={form.control} name="courseId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <FormControl>
                    <SimpleSelect value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("preferredBatchId", null); }} options={courses.map((c) => ({ value: c.id, label: c.title }))} placeholder="Choose a course" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="preferredMode" render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred learning mode</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid gap-2 sm:grid-cols-2">
                      <RadioCard value="ON_CAMPUS" title="On campus" description="Faisalabad campus, small batches" />
                      <RadioCard value="LIVE_ONLINE" title="Live online" description="Scheduled live classes from anywhere" />
                      <RadioCard value="HYBRID" title="Hybrid" description="Mix of campus and online" />
                      <RadioCard value="SELF_PACED" title="Self-paced" description="Recorded lessons, your schedule" />
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {course?.batches.length ? (
                <FormField control={form.control} name="preferredBatchId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred batch (optional)</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value ?? ""} onValueChange={(v) => field.onChange(v || null)} className="grid gap-2">
                        {course.batches.map((b) => (
                          <RadioCard key={b.id} value={b.id} title={`${b.name} · starts ${formatDate(b.startDate)}`} description={`${b.mode.replace("_", " ").toLowerCase()} · ${b.seatsLeft} seats left`} className="p-3" />
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>Admissions may suggest a different batch based on availability.</FormDescription>
                  </FormItem>
                )} />
              ) : null}
            </>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {([
                ["personal.firstName", "First name", "given-name"],
                ["personal.lastName", "Last name", "family-name"],
                ["personal.email", "Email", "email"],
                ["personal.phone", "Phone", "tel"],
                ["personal.whatsapp", "WhatsApp (if different)", "tel"],
                ["personal.city", "City", "address-level2"],
                ["personal.dateOfBirth", "Date of birth", "bday"],
              ] as const).map(([name, label, auto]) => (
                <FormField key={name} control={form.control} name={name} render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} type={name === "personal.dateOfBirth" ? "date" : name === "personal.email" ? "email" : "text"} autoComplete={auto} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              ))}
              <FormField control={form.control} name="personal.gender" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender (optional)</FormLabel>
                  <FormControl>
                    <SimpleSelect value={field.value ?? ""} onValueChange={field.onChange} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not", label: "Prefer not to say" }]} placeholder="Select" />
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="personal.address" render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} autoComplete="street-address" />
                  </FormControl>
                </FormItem>
              )} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <p className="text-h4">Education</p>
                {education.fields.map((f, i) => (
                  <div key={f.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_1fr_100px_auto]">
                    <FormField control={form.control} name={`education.${i}.level`} render={({ field }) => (<FormItem><FormLabel>Level</FormLabel><FormControl><Input placeholder="Matric / FSc / BS" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`education.${i}.institution`} render={({ field }) => (<FormItem><FormLabel>Institution</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`education.${i}.field`} render={({ field }) => (<FormItem><FormLabel>Field</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`education.${i}.year`} render={({ field }) => (<FormItem><FormLabel>Year</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                    <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => education.remove(i)} disabled={education.fields.length === 1} aria-label="Remove">
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => education.append({ level: "", institution: "", field: "", year: "" })}>
                  <Plus /> Add education
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-h4">Work experience (optional)</p>
                {experience.fields.map((f, i) => (
                  <div key={f.id} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_100px_auto]">
                    <FormField control={form.control} name={`experience.${i}.title`} render={({ field }) => (<FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name={`experience.${i}.company`} render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>)} />
                    <FormField control={form.control} name={`experience.${i}.years`} render={({ field }) => (<FormItem><FormLabel>Years</FormLabel><FormControl><Input type="number" min={0} {...field} value={(field.value as number | string | undefined) ?? ""} /></FormControl></FormItem>)} />
                    <Button type="button" variant="ghost" size="icon" className="self-end" onClick={() => experience.remove(i)} aria-label="Remove">
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={() => experience.append({ title: "", company: "", years: 0 })}>
                  <Plus /> Add experience
                </Button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <FormField control={form.control} name="goals" render={({ field }) => (
              <FormItem>
                <FormLabel>What do you want to achieve with this course?</FormLabel>
                <FormControl>
                  <Textarea rows={7} placeholder="A job, freelance clients, a promotion, a business — tell us what success looks like in six months." {...field} />
                </FormControl>
                <FormDescription>This helps your counsellor tailor the batch and support to you.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
          ) : null}

          {step === 4 ? (
            <div className="grid gap-6 sm:grid-cols-2">
              {([["CNIC", "CNIC / B-Form", "image/*,.pdf"], ["TRANSCRIPT", "Latest education certificate", "image/*,.pdf"], ["PHOTO", "Recent photo", "image/*"], ["CV", "CV (optional)", ".pdf,.doc,.docx"]] as const).map(([kind, label, accept]) => (
                <div key={kind} className="flex flex-col gap-2">
                  <p className="text-sm font-medium">{label}</p>
                  <FileUploader accept={accept} kind={kind === "PHOTO" ? "image" : "any"} maxSizeMb={10} folder="applications" value={files[kind] ?? []} onChange={(list) => setFiles((f) => ({ ...f, [kind]: list }))} hint="Up to 10 MB" />
                </div>
              ))}
              <p className="text-body-sm text-fg-muted sm:col-span-2">You can submit without documents and send them to your counsellor later.</p>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="flex flex-col gap-6">
              <dl className="grid gap-4 text-body-sm sm:grid-cols-2">
                <div><dt className="text-label text-fg-subtle">Course</dt><dd className="mt-1 font-medium text-fg">{course?.title}</dd></div>
                <div><dt className="text-label text-fg-subtle">Mode</dt><dd className="mt-1 text-fg">{values.preferredMode.replace("_", " ").toLowerCase()}</dd></div>
                <div><dt className="text-label text-fg-subtle">Applicant</dt><dd className="mt-1 text-fg">{values.personal.firstName} {values.personal.lastName} · {values.personal.email} · {values.personal.phone}</dd></div>
                <div><dt className="text-label text-fg-subtle">City</dt><dd className="mt-1 text-fg">{values.personal.city}</dd></div>
                <div className="sm:col-span-2"><dt className="text-label text-fg-subtle">Education</dt><dd className="mt-1 text-fg">{values.education.map((e) => `${e.level} — ${e.institution}${e.year ? ` (${e.year})` : ""}`).join("; ")}</dd></div>
                <div className="sm:col-span-2"><dt className="text-label text-fg-subtle">Goals</dt><dd className="mt-1 whitespace-pre-line text-fg">{values.goals}</dd></div>
                <div className="sm:col-span-2"><dt className="text-label text-fg-subtle">Documents</dt><dd className="mt-1 text-fg">{Object.values(files).flat().length || "None attached"}</dd></div>
              </dl>
              <FormField control={form.control} name="acceptTerms" render={({ field }) => (
                <FormItem>
                  <label className="flex items-start gap-3 text-body-sm">
                    <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} className="mt-0.5" />
                    <span>I confirm the information is accurate and I accept the admission terms, including fee and attendance policies.</span>
                  </label>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || pending}>
            <ArrowLeft className="rtl:rotate-180" /> Back
          </Button>
          <div className="flex gap-2">
            {signedIn && step > 0 && step < STEPS.length - 1 ? (
              <Button type="button" variant="secondary" onClick={() => submit(true)} loading={pending}>
                Save draft
              </Button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={next}>
                Continue <ArrowRight className="rtl:rotate-180" />
              </Button>
            ) : (
              <Button type="button" size="lg" onClick={() => submit(false)} loading={pending}>
                Submit application
              </Button>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
