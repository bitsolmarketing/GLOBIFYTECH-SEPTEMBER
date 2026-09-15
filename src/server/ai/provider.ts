import "server-only";
import type { LanguageModel } from "ai";
import { env } from "@/config/env";
import { AppError } from "@/server/errors";

export type AIProviderName = "openai" | "anthropic" | "google";

const DEFAULT_MODELS: Record<AIProviderName, string> = {
  anthropic: "claude-sonnet-5",
  openai: "gpt-5",
  google: "gemini-2.5-pro",
};

/** True when the configured provider has credentials; UI uses this to disable AI surfaces honestly. */
export function isAiConfigured(): boolean {
  const e = env();
  if (e.AI_PROVIDER === "anthropic") return !!e.ANTHROPIC_API_KEY;
  if (e.AI_PROVIDER === "openai") return !!e.OPENAI_API_KEY;
  return !!e.GOOGLE_GENERATIVE_AI_API_KEY;
}

export function aiProviderInfo() {
  const e = env();
  return { provider: e.AI_PROVIDER, model: e.AI_MODEL || DEFAULT_MODELS[e.AI_PROVIDER], configured: isAiConfigured() };
}

/**
 * Provider abstraction: the rest of the platform only ever calls `getModel()`.
 * Switch vendors with AI_PROVIDER / AI_MODEL — no code changes.
 */
export async function getModel(overrideProvider?: AIProviderName): Promise<LanguageModel> {
  const e = env();
  const provider = overrideProvider ?? e.AI_PROVIDER;
  const modelId = e.AI_MODEL || DEFAULT_MODELS[provider];
  switch (provider) {
    case "anthropic": {
      if (!e.ANTHROPIC_API_KEY) throw AppError.unavailable("Globify AI is not configured (ANTHROPIC_API_KEY missing).");
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      return createAnthropic({ apiKey: e.ANTHROPIC_API_KEY })(modelId);
    }
    case "openai": {
      if (!e.OPENAI_API_KEY) throw AppError.unavailable("Globify AI is not configured (OPENAI_API_KEY missing).");
      const { createOpenAI } = await import("@ai-sdk/openai");
      return createOpenAI({ apiKey: e.OPENAI_API_KEY })(modelId);
    }
    case "google": {
      if (!e.GOOGLE_GENERATIVE_AI_API_KEY) throw AppError.unavailable("Globify AI is not configured (GOOGLE_GENERATIVE_AI_API_KEY missing).");
      const { createGoogle } = await import("@ai-sdk/google");
      return createGoogle({ apiKey: e.GOOGLE_GENERATIVE_AI_API_KEY })(modelId);
    }
  }
}

export const BRAND_VOICE = `You are Globify AI, the learning assistant of Globify Tech (Faisalabad, Pakistan) — a practical, project-first institute whose tagline is "Learn Today. Lead Tomorrow."
Tone: warm, confident, concise. Prefer plain English; Urdu phrases are welcome when the learner uses them. Use short paragraphs and lists. Never invent facts about the institute, prices or dates — say you don't know and point to the right page or a counsellor.`;
