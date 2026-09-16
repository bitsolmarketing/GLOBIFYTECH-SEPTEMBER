import { getTranslations } from "next-intl/server";
import { requireSurface } from "@/server/auth/session";
import { AppShell, type ShellNavGroup } from "@/components/layout/app-shell";
import { INSTRUCTOR_NAV } from "@/config/navigation";
import { unreadMessageCount } from "@/server/services/community";
import { instructorScope } from "@/server/services/instructor-scope";
import { prisma } from "@/server/db/prisma";
import { ROLE_LABELS, can, canAccessSurface } from "@/lib/rbac";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("instructor", "/instructor/dashboard");
  const scope = await instructorScope(user);
  const [t, tg, tc, messages, grading] = await Promise.all([
    getTranslations("instructor.nav"),
    getTranslations("admin.groups"),
    getTranslations("command"),
    unreadMessageCount(user.id),
    prisma.assignmentSubmission.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] }, assignment: { course: scope.courseWhere } } }),
  ]);
  const groups: ShellNavGroup[] = INSTRUCTOR_NAV.map((g) => ({
    key: g.key,
    label: tg(g.key as never),
    items: g.items.filter((i) => !i.permission || can(user, i.permission)).map((i) => ({ key: i.key, href: i.href, icon: i.icon, label: t(i.key as never), badgeCount: i.badge === "messages" ? messages : i.badge === "grading" ? grading : undefined })),
  }));
  const surfaces = [canAccessSurface(user, "admin") && { label: "Admin", href: "/admin/dashboard" }, canAccessSurface(user, "student") && { label: "Student view", href: "/student/dashboard" }].filter(Boolean) as Array<{ label: string; href: string }>;
  return (
    <AppShell
      surface="instructor"
      groups={groups}
      user={{ name: user.name, email: user.email, image: user.image, roleLabel: user.roles.map((r) => ROLE_LABELS[r]).join(" · "), surfaces }}
      commands={[
        { id: "new-course", label: "Create course", hint: "Start from scratch or with AI", href: "/instructor/course-builder", icon: "Hammer" },
        { id: "grade", label: "Grade submissions", hint: `${grading} waiting`, href: "/instructor/submissions", icon: "Inbox" },
        { id: "attendance", label: "Mark attendance", href: "/instructor/attendance", icon: "UserCheck" },
        { id: "live", label: "Schedule live class", href: "/instructor/live-classes?new=1", icon: "Video" },
      ]}
      surfaceLabel="Instructor Studio"
      searchPlaceholder={tc("placeholder")}
    >
      {children}
    </AppShell>
  );
}
