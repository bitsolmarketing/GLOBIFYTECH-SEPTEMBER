import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Award, FolderKanban, Layers } from "lucide-react";
import { requireStudentProfile } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { opportunitiesForStudent } from "@/server/services/career";
import { PageHeader } from "@/components/layout/page-header";
import { StatTile } from "@/components/lms/dashboard-widgets";
import { OpportunityList, SkillsEditor, CareerProfileForm } from "@/components/lms/career-widgets";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Career Center" };
export const dynamic = "force-dynamic";

export default async function CareerPage() {
  const { studentId } = await requireStudentProfile();
  const [student, opps, skills] = await Promise.all([
    prisma.studentProfile.findUniqueOrThrow({ where: { id: studentId }, include: { skills: { include: { skill: true } }, cv: true, portfolio: { select: { username: true, isPublic: true, _count: { select: { projects: true } } } }, _count: { select: { certificates: true, jobApplications: true } } } }),
    opportunitiesForStudent(studentId),
    prisma.skill.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const cards = [
    ...opps.jobs.map((j) => ({ id: j.id, kind: "job" as const, title: j.title, employer: j.employer, location: j.location, isRemote: j.isRemote, type: j.type, salaryMin: j.salaryMin ? toNumber(j.salaryMin) : null, salaryMax: j.salaryMax ? toNumber(j.salaryMax) : null, currency: j.currency, skills: j.skills.map((s) => ({ id: s.skillId, name: s.skill.name, required: s.required })), match: j.match, appliedStatus: j.appliedStatus })),
    ...opps.internships.map((i) => ({ id: i.id, kind: "internship" as const, title: i.title, employer: i.employer, location: i.location, isRemote: i.isRemote, stipend: i.stipend ? toNumber(i.stipend) : null, durationWeeks: i.durationWeeks, currency: i.currency, skills: i.skills.map((s) => ({ id: s.skillId, name: s.skill.name, required: s.required })), match: i.match, appliedStatus: i.appliedStatus })),
  ].sort((a, b) => b.match.percent - a.match.percent);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Career Center" description="Jobs and internships matched to your verified skills, plus the profile employers see." actions={<Button asChild variant="secondary"><Link href="/student/portfolio"><Layers /> Portfolio</Link></Button>} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Briefcase} label="Open opportunities" value={cards.length} tone="accent" />
        <StatTile icon={Award} label="Certificates" value={student._count.certificates} tone="success" />
        <StatTile icon={FolderKanban} label="Portfolio projects" value={student.portfolio?._count.projects ?? 0} />
        <StatTile icon={Briefcase} label="Applications sent" value={student._count.jobApplications} />
      </div>
      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="profile">Career profile</TabsTrigger>
        </TabsList>
        <TabsContent value="opportunities">
          <OpportunityList items={cards} cvMediaId={student.cvMediaId} />
        </TabsContent>
        <TabsContent value="skills">
          <div className="surface p-6">
            <SkillsEditor allSkills={skills} initial={student.skills.map((s) => ({ skillId: s.skillId, level: s.level, verified: s.verified, name: s.skill.name }))} />
          </div>
        </TabsContent>
        <TabsContent value="profile">
          <div className="surface p-6">
            <CareerProfileForm initial={{ headline: student.headline ?? "", bio: student.bio ?? "", githubUrl: student.githubUrl ?? "", linkedinUrl: student.linkedinUrl ?? "", websiteUrl: student.websiteUrl ?? "", cv: student.cv ? { mediaId: student.cv.id, url: student.cv.url, fileName: student.cv.fileName, mime: student.cv.mime, size: student.cv.size } : null, freelanceProfiles: ((student.freelanceProfiles as Array<{ platform: string; url: string }> | null) ?? []) }} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
