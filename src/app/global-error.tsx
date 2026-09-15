"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#0b0d12", margin: 0 }}>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div style={{ maxWidth: 420 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", marginBottom: 8 }}>We couldn&apos;t load your learning space.</h1>
            <p style={{ color: "#5b6472", marginBottom: 20 }}>Something went wrong on our side. Please try again in a moment.</p>
            <button
              onClick={reset}
              style={{ background: "#2563ff", color: "#fff", border: 0, borderRadius: 10, padding: "10px 18px", fontWeight: 500, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
