import { ErrorState } from "@/components/ui/error-state";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Access restricted" };

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="container-x py-6">
        <Logo />
      </div>
      <ErrorState kind="forbidden" full />
    </main>
  );
}
