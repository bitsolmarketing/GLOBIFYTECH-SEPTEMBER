import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Globify mark: a globe arc + rising node, drawn with the brand gradient.
 * Inline SVG so it inherits theme and needs no asset request.
 */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <defs>
        <linearGradient id="gl-brand" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563FF" />
          <stop offset="0.55" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#gl-brand)" />
      <path d="M8 19.5c2.6-6.4 8.4-9.5 16-9.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M9.5 23.5c3.2-3.6 7.6-5.5 13-5.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeOpacity="0.75" />
      <circle cx="23" cy="10" r="2.6" fill="white" />
    </svg>
  );
}

export function Logo({ className, href = "/", wordmark = true, size = 28 }: { className?: string; href?: string; wordmark?: boolean; size?: number }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 font-semibold tracking-tight text-fg", className)} aria-label="Globify Tech home">
      <LogoMark size={size} />
      {wordmark ? (
        <span className="text-[17px] leading-none">
          Globify<span className="text-fg-muted"> Tech</span>
        </span>
      ) : null}
    </Link>
  );
}
