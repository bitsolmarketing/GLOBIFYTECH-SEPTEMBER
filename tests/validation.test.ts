import { describe, expect, it } from "vitest";
import { publicLeadSchema, applicationSchema, leadStageChangeSchema } from "@/lib/validation/crm";
import { recordPaymentSchema, feePlanSchema, discountSchema } from "@/lib/validation/finance";
import { batchSchema, enrollmentSchema } from "@/lib/validation/delivery";
import { courseSchema } from "@/lib/validation/course";
import { pageSchema, blogPostSchema } from "@/lib/validation/cms";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import { fieldErrors, pagination } from "@/lib/validation/common";

describe("public lead capture", () => {
  const valid = { name: "Imran Qureshi", phone: "+923001234567", email: "imran@example.com", city: "Faisalabad", source: "WEBSITE" as const };

  it("accepts a well-formed enquiry", () => {
    expect(publicLeadSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a name and a phone number", () => {
    expect(publicLeadSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(publicLeadSchema.safeParse({ ...valid, phone: "" }).success).toBe(false);
  });

  it("rejects an invalid email but allows none at all", () => {
    expect(publicLeadSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
    expect(publicLeadSchema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });

  it("keeps the honeypot field empty", () => {
    expect(publicLeadSchema.safeParse({ ...valid, website: "http://spam.example" }).success).toBe(false);
    expect(publicLeadSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
  });

  it("defaults the source to the website", () => {
    const parsed = publicLeadSchema.parse({ name: "Ali", phone: "+923001234567" });
    expect(parsed.source).toBe("WEBSITE");
  });

  it("caps a very long message rather than storing it", () => {
    expect(publicLeadSchema.safeParse({ ...valid, message: "x".repeat(5000) }).success).toBe(false);
  });
});

describe("admissions application", () => {
  const valid = {
    courseId: "8f3e1c2a-1111-4222-8333-444455556666",
    preferredMode: "HYBRID" as const,
    personal: { firstName: "Owais", lastName: "Rasheed", email: "owais@example.com", phone: "+923001234567", city: "Faisalabad" },
    education: [{ level: "Intermediate", institution: "Government College", field: "Pre-engineering", year: "2023" }],
    goals: "I want a career in technology that I can build from Faisalabad.",
    acceptTerms: true,
  };

  it("accepts a complete application", () => {
    expect(applicationSchema.safeParse(valid).success).toBe(true);
  });

  it("requires a real course id", () => {
    expect(applicationSchema.safeParse({ ...valid, courseId: "not-a-uuid" }).success).toBe(false);
  });

  it("requires the applicant to accept the terms", () => {
    expect(applicationSchema.safeParse({ ...valid, acceptTerms: false }).success).toBe(false);
  });

  it("requires contact details", () => {
    expect(applicationSchema.safeParse({ ...valid, personal: { ...valid.personal, email: "" } }).success).toBe(false);
  });
});

describe("finance validation", () => {
  const invoiceId = "8f3e1c2a-1111-4222-8333-444455556666";

  it("refuses a payment of zero or less", () => {
    expect(recordPaymentSchema.safeParse({ invoiceId, amount: 0, provider: "CASH" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ invoiceId, amount: -500, provider: "CASH" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ invoiceId, amount: 5000, provider: "CASH" }).success).toBe(true);
  });

  it("defaults an unspecified provider to bank transfer", () => {
    expect(recordPaymentSchema.parse({ invoiceId, amount: 100 }).provider).toBe("BANK_TRANSFER");
  });

  it("requires at least one fee instalment", () => {
    const base = { courseId: invoiceId, name: "Two instalments", totalAmount: 50000, currency: "PKR" };
    expect(feePlanSchema.safeParse({ ...base, installments: [] }).success).toBe(false);
    expect(feePlanSchema.safeParse({ ...base, installments: [{ label: "Full", amount: 50000, dueAfterDays: 0 }] }).success).toBe(true);
  });

  it("normalises a discount code to upper case and rejects odd characters", () => {
    expect(discountSchema.parse({ code: "earlybird", name: "Early bird", type: "PERCENT", value: 10 }).code).toBe("EARLYBIRD");
    expect(discountSchema.safeParse({ code: "bad code!", name: "X", type: "PERCENT", value: 10 }).success).toBe(false);
  });
});

describe("delivery validation", () => {
  const courseId = "8f3e1c2a-1111-4222-8333-444455556666";

  it("normalises a batch code and enforces the format", () => {
    const parsed = batchSchema.parse({ code: "dm-2026-03", name: "Evening", courseId, startDate: "2026-03-01" });
    expect(parsed.code).toBe("DM-2026-03");
    expect(batchSchema.safeParse({ code: "dm 2026", name: "Evening", courseId, startDate: "2026-03-01" }).success).toBe(false);
  });

  it("defaults a batch to eighteen seats", () => {
    expect(batchSchema.parse({ code: "DM-1", name: "Evening", courseId, startDate: "2026-03-01" }).capacity).toBe(18);
  });

  it("rejects a schedule with an impossible weekday", () => {
    const bad = batchSchema.safeParse({ code: "DM-1", name: "Evening", courseId, startDate: "2026-03-01", schedule: [{ dayOfWeek: 9, startTime: "18:00", endTime: "20:00" }] });
    expect(bad.success).toBe(false);
  });

  it("requires both a student and a course to enroll", () => {
    expect(enrollmentSchema.safeParse({ studentId: courseId, courseId }).success).toBe(true);
    expect(enrollmentSchema.safeParse({ courseId }).success).toBe(false);
  });
});

describe("content validation", () => {
  it("requires a page title and accepts the home slug", () => {
    expect(pageSchema.safeParse({ title: "" }).success).toBe(false);
    expect(pageSchema.safeParse({ title: "Home", slug: "home" }).success).toBe(true);
    expect(pageSchema.safeParse({ title: "About us", slug: "about-us" }).success).toBe(true);
  });

  it("caps SEO fields at search-engine limits", () => {
    expect(pageSchema.safeParse({ title: "About", seoTitle: "x".repeat(71) }).success).toBe(false);
    expect(pageSchema.safeParse({ title: "About", seoDescription: "x".repeat(161) }).success).toBe(false);
  });

  it("defaults a new post to draft", () => {
    expect(blogPostSchema.parse({ title: "How to get hired" }).status).toBe("DRAFT");
  });

  it("limits the number of tags on a post", () => {
    expect(blogPostSchema.safeParse({ title: "Post", tagNames: Array.from({ length: 11 }, (_, i) => `t${i}`) }).success).toBe(false);
  });

  it("requires a stage when moving a lead", () => {
    expect(leadStageChangeSchema.safeParse({ leadId: "8f3e1c2a-1111-4222-8333-444455556666", stage: "CONTACTED" }).success).toBe(true);
    expect(leadStageChangeSchema.safeParse({ leadId: "8f3e1c2a-1111-4222-8333-444455556666", stage: "NOT_A_STAGE" }).success).toBe(false);
  });

  it("requires a course title and a sensible price", () => {
    expect(courseSchema.safeParse({ title: "", price: 1000 }).success).toBe(false);
    expect(courseSchema.safeParse({ title: "AI for Business", price: -5 }).success).toBe(false);
  });
});

describe("auth validation", () => {
  it("requires an email and a password to sign in", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "secret123" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "nope", password: "secret123" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("enforces a strong password on sign up", () => {
    const strong = "Globify2026!secure";
    const base = { name: "Ali Raza", email: "ali@example.com", acceptTerms: true };
    expect(signUpSchema.safeParse({ ...base, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...base, password: strong, confirmPassword: strong }).success).toBe(true);
  });

  it("requires the two passwords to match", () => {
    const base = { name: "Ali Raza", email: "ali@example.com", acceptTerms: true };
    expect(signUpSchema.safeParse({ ...base, password: "Globify2026!secure", confirmPassword: "Globify2026!other" }).success).toBe(false);
  });
});

describe("shared helpers", () => {
  it("defaults and clamps pagination", () => {
    expect(pagination.parse({}).limit).toBe(20);
    expect(pagination.safeParse({ limit: 0 }).success).toBe(false);
    expect(pagination.safeParse({ limit: 500 }).success).toBe(false);
    expect(pagination.parse({ limit: "50" }).limit).toBe(50);
  });

  it("turns Zod issues into a field to messages map", () => {
    const result = publicLeadSchema.safeParse({ name: "", phone: "" });
    expect(result.success).toBe(false);
    if (result.success) return;
    const errors = fieldErrors(result.error);
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(["name", "phone"]));
    expect(errors.name?.[0]).toBeTypeOf("string");
  });
});
