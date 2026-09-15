import type { Metadata } from "next";
import { requireStudentProfile } from "@/server/auth/session";
import { getOwnPortfolio } from "@/server/services/career";
import { PageHeader } from "@/components/layout/page-header";
import { PortfolioEditor } from "@/components/lms/portfolio-editor";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Portfolio" };
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const { studentId } = await requireStudentProfile();
  const p = await getOwnPortfolio(studentId);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Portfolio" description="Your public page. Approved course projects land here automatically; add your own too." />
      <PortfolioEditor
        portfolio={{ username: p.username, headline: p.headline ?? "", about: p.about ?? "", isPublic: p.isPublic, showCertificates: p.showCertificates, showSkills: p.showSkills }}
        publicUrl={absoluteUrl(`/portfolio/${p.username}`)}
        projects={p.projects.map((pr) => ({ id: pr.id, title: pr.title, description: pr.description ?? "", coverMediaId: pr.coverMediaId, coverUrl: pr.cover?.url ?? null, repoUrl: pr.repoUrl ?? "", liveUrl: pr.liveUrl ?? "", skills: pr.skills, isVisible: pr.isVisible }))}
      />
    </div>
  );
}
