/**
 * Provider-agnostic chat completion helper (server-only).
 *
 * Gemini, OpenAI and GROQ all expose the SAME OpenAI-compatible Chat
 * Completions schema (Gemini via its OpenAI-compat endpoint), so we just swap
 * base URL + model + key. Gemini is preferred when GEMINI_API_KEY is set; we
 * then fall back to GROQ - both when no Gemini key is configured AND when a
 * Gemini call fails at runtime (e.g. quota, outage). This keeps the assistant
 * working and uses Gemini whenever it can.
 */
import { env } from "@/lib/env"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type ChatCompleteResult = { text: string; provider: string }

type ProviderConfig = {
  provider: string
  url: string
  apiKey: string
  model: string
}

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
const TIMEOUT_MS = 20000

/**
 * Ordered list of usable providers: Gemini first (preferred) when its key is
 * set, then GROQ. chatComplete tries them in order so a runtime Gemini failure
 * transparently falls back to GROQ instead of failing the user.
 */
export function resolveProviders(): ProviderConfig[] {
  const list: ProviderConfig[] = []
  if (env.GEMINI_API_KEY) {
    list.push({ provider: "gemini", url: GEMINI_URL, apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL ?? "gemini-2.0-flash" })
  }
  if (env.GROQ_API_KEY) {
    list.push({ provider: "groq", url: GROQ_URL, apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL ?? "llama-3.1-8b-instant" })
  }
  return list
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super("No AI provider configured (set GEMINI_API_KEY or GROQ_API_KEY)")
    this.name = "AiNotConfiguredError"
  }
}

async function callProvider(
  cfg: ProviderConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number },
): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        messages,
        temperature: opts.temperature ?? 0.4,
        max_tokens: opts.maxTokens ?? 700,
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  const body = await res.text()
  if (!res.ok) {
    throw new Error(`${cfg.provider} API error ${res.status}: ${body.slice(0, 300)}`)
  }

  const data = JSON.parse(body)
  const content: unknown = data?.choices?.[0]?.message?.content
  const text = typeof content === "string" ? content.replace(/\*/g, "").trim() : ""
  return text || "No response was generated. Please try again."
}

export async function chatComplete(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<ChatCompleteResult> {
  const providers = resolveProviders()
  if (providers.length === 0) throw new AiNotConfiguredError()

  let lastError: unknown
  for (const cfg of providers) {
    try {
      const text = await callProvider(cfg, messages, opts)
      return { text, provider: cfg.provider }
    } catch (err) {
      lastError = err
      console.error(`AI provider ${cfg.provider} failed, trying next if available:`, err)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All AI providers failed")
}

/**
 * Open a streaming (Server-Sent Events) chat completion. Tries providers in
 * order and only returns once a provider responds OK, so the Gemini -> GROQ
 * fallback still works before any bytes are streamed to the client. The caller
 * is responsible for reading and parsing the SSE body.
 */
export async function openChatStream(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<{ provider: string; upstream: Response }> {
  const providers = resolveProviders()
  if (providers.length === 0) throw new AiNotConfiguredError()

  let lastError: unknown
  for (const cfg of providers) {
    // Connect timeout only: cleared once headers arrive so the stream can run.
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: cfg.model,
          messages,
          temperature: opts.temperature ?? 0.4,
          max_tokens: opts.maxTokens ?? 700,
          stream: true,
        }),
      })
      clearTimeout(timeout)
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "")
        lastError = new Error(`${cfg.provider} stream error ${res.status}: ${body.slice(0, 200)}`)
        console.error(lastError)
        continue
      }
      return { provider: cfg.provider, upstream: res }
    } catch (err) {
      clearTimeout(timeout)
      lastError = err
      console.error(`AI provider ${cfg.provider} stream failed, trying next if available:`, err)
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All AI providers failed")
}
