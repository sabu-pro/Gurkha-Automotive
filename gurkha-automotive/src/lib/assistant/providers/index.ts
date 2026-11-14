import { ruleBasedProvider } from "@/lib/assistant/providers/rule-based";
import type { AssistantProvider } from "@/lib/assistant/providers/types";

export type { AssistantProvider, InterpretRequest } from "@/lib/assistant/providers/types";

/**
 * Provider registry. Server-only: selected by the AI_PROVIDER
 * environment variable, defaulting to the free rule-based provider.
 *
 * To add one (e.g. Claude, OpenAI, Gemini or a local Ollama model):
 *   1. Create src/lib/assistant/providers/<name>.ts exporting a factory
 *      that returns an AssistantProvider. Read its API key / base URL
 *      from a server-only env var (never NEXT_PUBLIC_*). For Claude, use
 *      the official @anthropic-ai/sdk package.
 *   2. Register the factory below.
 *   3. Set AI_PROVIDER=<name> plus that provider's env vars in Vercel.
 * If the factory throws (e.g. missing key), the assistant silently
 * keeps working on the rule-based provider.
 */
const factories: Record<string, () => AssistantProvider> = {
  "rule-based": () => ruleBasedProvider,
  // anthropic: () => createAnthropicProvider(),
  // openai: () => createOpenAiProvider(),
  // gemini: () => createGeminiProvider(),
  // ollama: () => createOllamaProvider(),
};

let warned = false;

export function getAssistantProvider(): AssistantProvider {
  const id = (process.env.AI_PROVIDER ?? "rule-based").trim().toLowerCase() || "rule-based";
  const factory = factories[id];
  if (!factory) {
    if (!warned) {
      console.warn(`AI_PROVIDER "${id}" is not registered; using the rule-based booking assistant.`);
      warned = true;
    }
    return ruleBasedProvider;
  }
  try {
    return factory();
  } catch (error) {
    console.error(`AI provider "${id}" could not start; using the rule-based booking assistant.`, error);
    return ruleBasedProvider;
  }
}

/** True only when a provider that calls an external API is active. */
export function isExternalAiEnabled(): boolean {
  return getAssistantProvider().usesExternalApi;
}
