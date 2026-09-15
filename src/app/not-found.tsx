import { ErrorState } from "@/components/ui/error-state";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="container-x py-6">
        <Logo />
      </div>
      <ErrorState kind="not-found" full />
    </main>
  );
}
