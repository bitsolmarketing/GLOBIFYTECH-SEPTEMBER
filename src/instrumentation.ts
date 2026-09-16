/**
 * Next.js instrumentation hook. Runs once per server process, before any
 * request is handled.
 *
 * It verifies the environment is complete so a misconfigured deploy fails at
 * boot with a clear message rather than at the first request, and registers
 * OpenTelemetry when an endpoint is configured.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { env } = await import("@/config/env");
  const e = env();
  const { log } = await import("@/server/log");

  log.info("starting", {
    node: process.version,
    environment: process.env.NODE_ENV,
    storage: e.STORAGE_DRIVER,
    email: e.EMAIL_DRIVER,
    whatsapp: e.WHATSAPP_DRIVER,
    sms: e.SMS_DRIVER,
    liveClasses: e.LIVE_CLASS_DRIVER,
    ai: e.AI_PROVIDER,
    jobs: e.REDIS_URL ? "redis" : "inline",
  });

  // Warn loudly about settings that are fine locally but wrong in production.
  if (process.env.NODE_ENV === "production") {
    const warnings: string[] = [];
    if (e.AUTH_SECRET.includes("dev-only")) warnings.push("AUTH_SECRET is still the development placeholder");
    if (!e.REDIS_URL) warnings.push("REDIS_URL is unset, so background jobs run in the web process");
    if (e.STORAGE_DRIVER === "local") warnings.push("STORAGE_DRIVER is local, so uploads will not survive a redeploy");
    if (e.EMAIL_DRIVER === "console") warnings.push("EMAIL_DRIVER is console, so no email will actually be sent");
    for (const w of warnings) log.warn("configuration", { warning: w });
  }

  if (e.OTEL_EXPORTER_OTLP_ENDPOINT) {
    try {
      // Optional peer, resolved at runtime so the package is not required to
      // build. Install it only if you export traces: pnpm add @vercel/otel
      const specifier = "@vercel/otel";
      const otel = (await import(specifier)) as { registerOTel: (options: { serviceName: string }) => void };
      otel.registerOTel({ serviceName: "globify-tech" });
      log.info("telemetry enabled", { endpoint: e.OTEL_EXPORTER_OTLP_ENDPOINT });
    } catch {
      log.warn("telemetry requested but @vercel/otel is not installed; run pnpm add @vercel/otel");
    }
  }
}

/** Reports uncaught request errors with enough context to find them. */
export async function onRequestError(error: unknown, request: { path: string; method: string }) {
  const { log } = await import("@/server/log");
  log.error("request failed", {
    path: request.path,
    method: request.method,
    error: error instanceof Error ? error.message : String(error),
  });
}
