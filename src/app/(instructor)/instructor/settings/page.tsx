import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm, PasswordForm, SecurityActions } from "@/components/lms/settings-forms";
import { InstructorProfileForm } from "./instructor-profile-form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function InstructorSettingsPage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, include: { avatar: { select: { url: true } }, instructorProfile: true } });
  const ip = user.instructorProfile;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Your public instructor profile, account and security." />
      <Tabs defaultValue={ip ? "instructor" : "profile"}>
        <TabsList>
          {ip ? <TabsTrigger value="instructor">Instructor profile</TabsTrigger> : null}
          <TabsTrigger value="profile">Account</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        {ip ? (
          <TabsContent value="instructor">
            <div className="surface p-6">
              <InstructorProfileForm initial={{ title: ip.title ?? "", bio: ip.bio ?? "", expertise: ip.expertise, yearsExperience: ip.yearsExperience, linkedinUrl: ip.linkedinUrl ?? "", websiteUrl: ip.websiteUrl ?? "", isPublic: ip.isPublic, slug: ip.slug }} />
            </div>
          </TabsContent>
        ) : null}
        <TabsContent value="profile">
          <div className="surface p-6">
            <ProfileForm showStudentFields={false} initial={{ name: user.name, email: user.email, phone: user.phone ?? "", whatsapp: user.whatsapp ?? "", locale: user.locale, timezone: user.timezone, headline: "", bio: "", city: "", githubUrl: "", linkedinUrl: "", websiteUrl: "", avatarUrl: user.avatar?.url ?? null }} />
          </div>
        </TabsContent>
        <TabsContent value="password"><div className="surface p-6"><PasswordForm /></div></TabsContent>
        <TabsContent value="security"><div className="surface p-6"><SecurityActions /></div></TabsContent>
      </Tabs>
    </div>
  );
}
