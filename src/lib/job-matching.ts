/**
 * Job / internship matching (pure). Skill overlap weighted by whether the
 * skill is required, boosted by verified skills and certificates.
 */
export interface MatchStudent {
  skills: Array<{ skillId: string; level: number; verified: boolean }>;
  certificateCourseSkillIds: string[];
  city?: string | null;
}

export interface MatchJob {
  skills: Array<{ skillId: string; required: boolean }>;
  location?: string | null;
  isRemote: boolean;
}

export interface MatchResult {
  percent: number;
  matchedSkillIds: string[];
  missingRequiredSkillIds: string[];
}

export function matchJob(student: MatchStudent, job: MatchJob): MatchResult {
  if (!job.skills.length) return { percent: 50, matchedSkillIds: [], missingRequiredSkillIds: [] };
  const have = new Map(student.skills.map((s) => [s.skillId, s]));
  const certified = new Set(student.certificateCourseSkillIds);
  let earned = 0;
  let possible = 0;
  const matched: string[] = [];
  const missingRequired: string[] = [];
  for (const js of job.skills) {
    const weight = js.required ? 2 : 1;
    possible += weight;
    const s = have.get(js.skillId);
    if (s) {
      const levelFactor = 0.6 + (Math.min(5, Math.max(1, s.level)) / 5) * 0.4; // 0.68–1.0
      const boost = s.verified || certified.has(js.skillId) ? 1 : 0.85;
      earned += weight * levelFactor * boost;
      matched.push(js.skillId);
    } else if (js.required) {
      missingRequired.push(js.skillId);
    }
  }
  let percent = possible ? (earned / possible) * 100 : 0;
  if (!job.isRemote && job.location && student.city && job.location.toLowerCase().includes(student.city.toLowerCase())) percent = Math.min(100, percent + 5);
  return { percent: Math.round(percent), matchedSkillIds: matched, missingRequiredSkillIds: missingRequired };
}
