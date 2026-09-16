import { describe, expect, it } from "vitest";
import { matchJob, type MatchJob, type MatchStudent } from "@/lib/job-matching";

const student = (over: Partial<MatchStudent> = {}): MatchStudent => ({
  skills: [
    { skillId: "react", level: 4, verified: true },
    { skillId: "next", level: 3, verified: false },
  ],
  certificateCourseSkillIds: ["react"],
  city: "Faisalabad",
  ...over,
});

const job = (over: Partial<MatchJob> = {}): MatchJob => ({
  skills: [
    { skillId: "react", required: true },
    { skillId: "next", required: false },
  ],
  location: "Faisalabad",
  isRemote: false,
  ...over,
});

describe("job matching", () => {
  it("scores a strong match highly and lists the matched skills", () => {
    const r = matchJob(student(), job());
    expect(r.percent).toBeGreaterThan(80);
    expect(r.matchedSkillIds).toEqual(expect.arrayContaining(["react", "next"]));
    expect(r.missingRequiredSkillIds).toHaveLength(0);
  });

  it("names the required skills a student is missing", () => {
    const r = matchJob(student({ skills: [{ skillId: "next", level: 3, verified: false }] }), job());
    expect(r.missingRequiredSkillIds).toEqual(["react"]);
    expect(r.percent).toBeLessThan(50);
  });

  it("scores zero when the student has none of the skills", () => {
    const r = matchJob(student({ skills: [], certificateCourseSkillIds: [] }), job());
    expect(r.percent).toBe(0);
    expect(r.missingRequiredSkillIds).toEqual(["react"]);
  });

  it("weighs required skills more than optional ones", () => {
    const onlyRequired = matchJob(student({ skills: [{ skillId: "react", level: 4, verified: true }] }), job());
    const onlyOptional = matchJob(student({ skills: [{ skillId: "next", level: 4, verified: true }], certificateCourseSkillIds: [] }), job());
    expect(onlyRequired.percent).toBeGreaterThan(onlyOptional.percent);
  });

  it("rewards a higher skill level", () => {
    const novice = matchJob(student({ skills: [{ skillId: "react", level: 1, verified: false }], certificateCourseSkillIds: [] }), job());
    const expert = matchJob(student({ skills: [{ skillId: "react", level: 5, verified: false }], certificateCourseSkillIds: [] }), job());
    expect(expert.percent).toBeGreaterThan(novice.percent);
  });

  it("rewards verified skills over self-declared ones", () => {
    const claimed = matchJob(student({ skills: [{ skillId: "react", level: 3, verified: false }], certificateCourseSkillIds: [] }), job());
    const verified = matchJob(student({ skills: [{ skillId: "react", level: 3, verified: true }], certificateCourseSkillIds: [] }), job());
    expect(verified.percent).toBeGreaterThan(claimed.percent);
  });

  it("treats a certificate in the skill as verification", () => {
    const withCert = matchJob(student({ skills: [{ skillId: "react", level: 3, verified: false }], certificateCourseSkillIds: ["react"] }), job());
    const without = matchJob(student({ skills: [{ skillId: "react", level: 3, verified: false }], certificateCourseSkillIds: [] }), job());
    expect(withCert.percent).toBeGreaterThan(without.percent);
  });

  it("gives a small boost when the student is in the job's city", () => {
    const local = matchJob(student({ city: "Faisalabad" }), job({ location: "Faisalabad", isRemote: false }));
    const distant = matchJob(student({ city: "Karachi" }), job({ location: "Faisalabad", isRemote: false }));
    expect(local.percent).toBeGreaterThanOrEqual(distant.percent);
  });

  it("does not apply a location boost to remote jobs", () => {
    const local = matchJob(student({ city: "Faisalabad" }), job({ isRemote: true }));
    const distant = matchJob(student({ city: "Karachi" }), job({ isRemote: true }));
    expect(local.percent).toBe(distant.percent);
  });

  it("never exceeds 100 percent", () => {
    const r = matchJob(student({ skills: [{ skillId: "react", level: 5, verified: true }, { skillId: "next", level: 5, verified: true }] }), job());
    expect(r.percent).toBeLessThanOrEqual(100);
  });

  it("returns a neutral score for a job with no listed skills", () => {
    const r = matchJob(student(), job({ skills: [] }));
    expect(r.percent).toBe(50);
    expect(r.matchedSkillIds).toHaveLength(0);
  });

  it("is deterministic", () => {
    expect(matchJob(student(), job())).toEqual(matchJob(student(), job()));
  });
});
