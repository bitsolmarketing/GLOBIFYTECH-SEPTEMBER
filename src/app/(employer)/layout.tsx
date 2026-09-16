import { getTranslations } from "next-intl/server";
import { requireSurface } from "@/server/auth/session";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter, type FooterColumn } from "@/components/layout/site-footer";
import { getNavigation } from "@/server/services/cms";
import { homeForPrincipal } from "@/lib/rbac";

const FOOTER: FooterColumn[] = [
  { id: "hiring", label: "Hiring", items: [{ id: "roles", label: "Your roles", href: "/employer" }, { id: "careers", label: "Public careers board", href: "/careers" }, { id: "verify", label: "Verify a certificate", href: "/verify" }] },
  { id: "institute", label: "Globify Tech", items: [{ id: "about", label: "About", href: "/about" }, { id: "courses", label: "Courses", href: "/courses" }, { id: "contact", label: "Contact", href: "/contact" }] },
];

/**
 * Hiring partners get the public chrome rather than an internal shell: they are
 * guests of the institute, not staff, and only ever see their own postings.
 */
export default async function EmployerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSurface("employer", "/employer");
  const [t, tf, headerNav] = await Promise.all([getTranslations("nav"), getTranslations("footer"), getNavigation("header")]);
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        items={headerNav.length ? headerNav : [{ id: "careers", label: "Careers", href: "/careers", description: null }, { id: "courses", label: "Courses", href: "/courses", description: null }]}
        user={{ name: user.name, image: user.image, home: homeForPrincipal(user) }}
        labels={{ signIn: t("signIn"), signUp: t("signUp"), dashboard: t("dashboard"), openMenu: t("openMenu"), apply: t("apply") }}
      />
      <main id="content" className="flex-1">
        {children}
      </main>
      <SiteFooter columns={FOOTER} labels={{ tagline: tf("tagline"), rights: tf("rights", { year: new Date().getFullYear() }), campus: tf("campus"), privacy: tf("privacy"), terms: tf("terms") }} />
    </div>
  );
}
