import { getTranslations } from "next-intl/server";
import { requireSurface } from "@/server/auth/session";
import { AppShell, type ShellNavGroup } from "@/components/layout/app-shell";
import { STUDENT_NAV } from "@/config/navigation";
import { unreadCount } from "@/server/services/notifications";
import { unreadMessageCount } from "@/server/services/community";
import { ROLE_LABELS, canAccessSurface } from "@/lib/rbac";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("student", "/student/dashboard");
  const [t, tg, tc, notifications, messages] = await Promise.all([getTranslations("student.nav"), getTranslations("admin.groups"), getTranslations("command"), unreadCount(user.id), unreadMessageCount(user.id)]);
  const groups: ShellNavGroup[] = STUDENT_NAV.map((g) => ({
    key: g.key,
    label: tg(g.key as never),
    items: g.items.map((i) => ({ key: i.key, href: i.href, icon: i.icon, label: t(i.key as never), badgeCount: i.badge === "notifications" ? notifications : i.badge === "messages" ? messages : undefined })),
  }));
  const surfaces = [canAccessSurface(user, "instructor") && { label: "Instructor Studio", href: "/instructor/dashboard" }, canAccessSurface(user, "admin") && { label: "Admin", href: "/admin/dashboard" }].filter(Boolean) as Array<{ label: string; href: string }>;
  return (
    <AppShell
      surface="student"
      groups={groups}
      user={{ name: user.name, email: user.email, image: user.image, roleLabel: user.roles.map((r) => ROLE_LABELS[r]).join(" · "), surfaces }}
      commands={[
        { id: "resume", label: "Resume learning", hint: "Open your current course", href: "/student/dashboard", icon: "PlaySquare" },
        { id: "ai", label: "Ask Globify AI", hint: "Explain, quiz me, what next?", href: "/student/ai", icon: "Sparkles" },
        { id: "browse", label: "Browse courses", href: "/courses", icon: "BookOpen" },
      ]}
      surfaceLabel="Student"
      searchPlaceholder={tc("placeholder")}
    >
      {children}
    </AppShell>
  );
}
