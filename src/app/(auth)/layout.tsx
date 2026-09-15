import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Logo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-md animate-rise">{children}</div>
        </main>
        <footer className="px-6 py-5 text-caption text-fg-subtle md:px-10">
          © {new Date().getFullYear()} Globify Tech ·{" "}
          <Link href="/privacy" className="hover:text-fg">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-fg">
            Terms
          </Link>
        </footer>
      </div>
      <aside className="relative hidden overflow-hidden bg-fg text-fg-inverse lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_20%_10%,rgba(37,99,255,.35),transparent_60%),radial-gradient(700px_400px_at_90%_90%,rgba(124,58,237,.35),transparent_60%)]" aria-hidden />
        <div className="grid-fade absolute inset-0 opacity-30" aria-hidden />
        <div className="relative flex h-full flex-col justify-between p-12">
          <p className="text-label text-white/60">Learn today. Lead tomorrow.</p>
          <div className="flex flex-col gap-6">
            <blockquote className="max-w-lg text-2xl font-medium leading-snug tracking-tight text-white">
              “The first month I was nervous. By the third month I had a paying client. The projects are real — that changes everything.”
            </blockquote>
            <div>
              <p className="font-medium text-white">Hira Aslam</p>
              <p className="text-body-sm text-white/60">UI/UX Designer · Globify graduate</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[["8,500+", "Students"], ["92%", "Completion"], ["45+", "Hiring partners"]].map(([v, l]) => (
              <div key={l}>
                <dd className="text-h3 text-white">{v}</dd>
                <dt className="text-caption text-white/60">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
