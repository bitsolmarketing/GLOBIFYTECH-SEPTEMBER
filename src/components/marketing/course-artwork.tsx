import * as React from "react";
import { CATEGORY_ARTWORK } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Course art direction system. Each category owns a gradient + geometric
 * pattern; a seed (course slug) varies the composition so no two courses look
 * identical while the family stays recognisable. Replaces stock photography.
 */
function hash(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function CourseArtwork({ artworkKey = "ai", seed = "", title, className, imageUrl, alt }: { artworkKey?: string | null; seed?: string; title?: string; className?: string; imageUrl?: string | null; alt?: string | null }) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={alt ?? title ?? ""} className={cn("size-full object-cover", className)} loading="lazy" />;
  }
  const art = CATEGORY_ARTWORK[artworkKey ?? "ai"] ?? CATEGORY_ARTWORK.ai!;
  const h = hash(seed || title || artworkKey || "globify");
  const id = `art-${h.toString(36)}`;
  const angle = 100 + (h % 80);
  const ox = 20 + (h % 50);
  const oy = 30 + ((h >> 4) % 40);
  const pattern = art.pattern;

  return (
    <svg viewBox="0 0 400 225" className={cn("size-full", className)} role="img" aria-label={title ?? art.label} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-g`} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
          <stop offset="0%" stopColor={art.from} />
          <stop offset="100%" stopColor={art.to} />
        </linearGradient>
        <radialGradient id={`${id}-r`} cx={`${ox}%`} cy={`${oy}%`} r="70%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />
        </pattern>
        <pattern id={`${id}-dots`} width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#fff" fillOpacity="0.28" />
        </pattern>
      </defs>
      <rect width="400" height="225" fill={`url(#${id}-g)`} />
      <rect width="400" height="225" fill={`url(#${id}-r)`} />
      {pattern === "grid" ? <rect width="400" height="225" fill={`url(#${id}-grid)`} /> : null}
      {pattern === "dots" ? <rect width="400" height="225" fill={`url(#${id}-dots)`} /> : null}
      {pattern === "orbits" ? (
        <g fill="none" stroke="#fff" strokeOpacity="0.28" strokeWidth="1.2">
          <ellipse cx={ox * 4} cy={oy * 2.2} rx="150" ry="52" transform={`rotate(${-18 + (h % 30)} ${ox * 4} ${oy * 2.2})`} />
          <ellipse cx={ox * 4} cy={oy * 2.2} rx="105" ry="36" transform={`rotate(${22 + (h % 25)} ${ox * 4} ${oy * 2.2})`} />
          <circle cx={ox * 4} cy={oy * 2.2} r="14" fill="#fff" fillOpacity="0.85" stroke="none" />
          <circle cx={ox * 4 + 120} cy={oy * 2.2 - 30} r="5" fill="#fff" stroke="none" />
        </g>
      ) : null}
      {pattern === "waves" ? (
        <g fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M-20 ${60 + i * 34} C 80 ${30 + i * 34 + (h % 20)}, 160 ${100 + i * 34}, 260 ${60 + i * 34} S 420 ${40 + i * 34}, 460 ${70 + i * 34}`} />
          ))}
        </g>
      ) : null}
      {pattern === "diagonal" ? (
        <g stroke="#fff" strokeOpacity="0.22" strokeWidth="14" strokeLinecap="round">
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={-40 + i * 90 + (h % 30)} y1="260" x2={120 + i * 90 + (h % 30)} y2="-30" />
          ))}
        </g>
      ) : null}
      {pattern === "rings" ? (
        <g fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2">
          {[28, 56, 84, 112].map((r) => (
            <circle key={r} cx={ox * 5} cy={oy * 3} r={r} />
          ))}
          <circle cx={ox * 5} cy={oy * 3} r="10" fill="#fff" fillOpacity="0.9" stroke="none" />
        </g>
      ) : null}
      <rect x="0" y="150" width="400" height="75" fill="#000" fillOpacity="0.18" />
      <text x="20" y="196" fontFamily="ui-sans-serif, system-ui" fontSize="11" fontWeight="600" letterSpacing="2" fill="#fff" fillOpacity="0.85">
        {art.label.toUpperCase()}
      </text>
    </svg>
  );
}
