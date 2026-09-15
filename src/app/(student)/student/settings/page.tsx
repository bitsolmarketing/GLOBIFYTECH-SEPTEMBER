import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm, PasswordForm, SecurityActions } from "@/components/lms/settings-forms";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, include: { avatar: { select: { url: true } }, studentProfile: true } });
  const s = user.studentProfile;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Profile, language, password and security." />
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <div className="surface p-6">
            <ProfileForm showStudentFields={!!s} initial={{ name: user.name, email: user.email, phone: user.phone ?? "", whatsapp: user.whatsapp ?? "", locale: user.locale, timezone: user.timezone, headline: s?.headline ?? "", bio: s?.bio ?? "", city: s?.city ?? "", githubUrl: s?.githubUrl ?? "", linkedinUrl: s?.linkedinUrl ?? "", websiteUrl: s?.websiteUrl ?? "", avatarUrl: user.avatar?.url ?? null }} />
          </div>
        </TabsContent>
        <TabsContent value="password">
          <div className="surface p-6">
            <PasswordForm />
          </div>
        </TabsContent>
        <TabsContent value="security">
          <div className="surface p-6">
            <SecurityActions />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
