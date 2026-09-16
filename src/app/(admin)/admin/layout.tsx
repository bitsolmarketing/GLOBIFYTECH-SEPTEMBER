import { getTranslations } from "next-intl/server";
import { requireSurface } from "@/server/auth/session";
import { AppShell, type ShellNavGroup } from "@/components/layout/app-shell";
import { ADMIN_NAV } from "@/config/navigation";
import { unreadMessageCount } from "@/server/services/community";
import { prisma } from "@/server/db/prisma";
import { ROLE_LABELS, can, canAccessSurface } from "@/lib/rbac";
import type { CommandDef } from "@/components/layout/command-palette";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("admin", "/admin/dashboard");
  const [t, tg, tc, messages, newLeads] = await Promise.all([
    getTranslations("admin.nav"),
    getTranslations("admin.groups"),
    getTranslations("command"),
    unreadMessageCount(user.id),
    can(user, "crm.leads.read") ? prisma.lead.count({ where: { deletedAt: null, stage: "NEW" } }) : 0,
  ]);
  const groups: ShellNavGroup[] = ADMIN_NAV.map((g) => ({
    key: g.key,
    label: tg(g.key as never),
    items: g.items.filter((i) => !i.permission || can(user, i.permission)).map((i) => ({ key: i.key, href: i.href, icon: i.icon, label: t(i.key as never), badgeCount: i.badge === "messages" ? messages : i.badge === "leads" ? newLeads : undefined })),
  })).filter((g) => g.items.length);
  const commands: CommandDef[] = [
    can(user, "courses.create") && { id: "new-course", label: "Create course", href: "/instructor/course-builder", icon: "Hammer" },
    can(user, "students.read") && { id: "find-student", label: "Find student", hint: "Type a name, email or student number", href: "/admin/students", icon: "Users" },
    can(user, "applications.read") && { id: "apps-today", label: "Show today's applications", href: "/admin/applications?status=SUBMITTED", icon: "FileText" },
    can(user, "payments.read") && { id: "unpaid", label: "Show unpaid invoices", href: "/admin/invoices?status=OVERDUE", icon: "Receipt" },
    can(user, "reports.export") && { id: "report", label: "Generate report", href: "/admin/reports", icon: "FileBarChart" },
    can(user, "analytics.read") && { id: "inactive", label: "Find inactive students", hint: "At-risk list from the success engine", href: "/admin/analytics?tab=risk", icon: "AlertTriangle" },
    can(user, "crm.leads.read") && { id: "lead", label: "New lead", href: "/admin/leads/new", icon: "Kanban" },
    can(user, "ai.admin_assistant") && { id: "ai", label: "Ask the admin assistant", href: "/admin/ai", icon: "Sparkles" },
  ].filter(Boolean) as CommandDef[];
  const surfaces = [canAccessSurface(user, "instructor") && { label: "Instructor Studio", href: "/instructor/dashboard" }, canAccessSurface(user, "student") && { label: "Student view", href: "/student/dashboard" }].filter(Boolean) as Array<{ label: string; href: string }>;
  return (
    <AppShell surface="admin" groups={groups} user={{ name: user.name, email: user.email, image: user.image, roleLabel: user.roles.map((r) => ROLE_LABELS[r]).join(" · "), surfaces }} commands={commands} surfaceLabel="Admin Command Center" searchPlaceholder={tc("placeholder")}>
      {children}
    </AppShell>
  );
}
