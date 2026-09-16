import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Globify Tech — Learn Today. Lead Tomorrow.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#07080b 0%,#101318 60%,#0b1a3a 100%)", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#2563FF,#06B6D4 55%,#7C3AED)" }} />
          <div style={{ display: "flex", gap: 10, fontSize: 34, fontWeight: 600, letterSpacing: -1 }}>
            <span>Globify</span>
            <span style={{ color: "#a3abb8" }}>Tech</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, lineHeight: 1 }}>Learn today.</div>
          <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, lineHeight: 1, background: "linear-gradient(90deg,#4d7cff,#22d3ee,#a78bfa)", backgroundClip: "text", color: "transparent" }}>Lead tomorrow.</div>
          <div style={{ marginTop: 20, fontSize: 30, color: "#a3abb8" }}>AI-powered education designed for the careers of tomorrow.</div>
        </div>
        <div style={{ display: "flex", gap: 48, fontSize: 24, color: "#a3abb8" }}>
          <span>8,500+ students</span>
          <span>92% completion</span>
          <span>45+ hiring partners</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
