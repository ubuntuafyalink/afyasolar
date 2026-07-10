/**
 * AI assistant endpoint (POST). Auth-required so the provider key cannot be
 * abused anonymously; it is intentionally NOT added to the public allowlist in
 * src/proxy.ts. Provider is Gemini when GEMINI_API_KEY is set, else GROQ.
 *
 * Body: {
 *   messages: { role, content }[]   // prior turns (user/assistant)
 *   context?: string                // page / data context to ground answers
 *   mode?: "chat" | "interpret"     // interpret = explain climate numbers
 * }
 * Returns: { reply, provider }
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth/config"
import { chatComplete, openChatStream, AiNotConfiguredError, type ChatMessage } from "@/lib/ai/provider"
import { rateLimit, getClientIdentifier } from "@/lib/rate-limit"
import { logAudit } from "@/lib/audit-log"

// --- Tunable guardrails (centralized so they are not scattered magic numbers) ---
const MAX_HISTORY_TURNS = 12 // turns sent upstream
const MAX_MESSAGE_CHARS = 4000 // per-message content cap
const MAX_MESSAGES_IN = 60 // reject absurd payloads before processing
const CONTEXT_CHAR_CAP = 4000 // grounding context slice
const RATE_PER_MIN = 20 // per-user requests / minute
const RATE_PER_DAY = 300 // per-user requests / day

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .min(1)
    .max(MAX_MESSAGES_IN),
  context: z.string().optional(),
  mode: z.enum(["chat", "interpret"]).optional(),
  stream: z.boolean().optional(),
})

/**
 * Transform an upstream OpenAI-compatible SSE body into a plain-text stream of
 * token deltas, so the client can read it with response.body.getReader() and
 * render real-time "AI typing".
 */
function toTextStream(upstream: Response): ReadableStream<Uint8Array> {
  const reader = upstream.body!.getReader()
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ""

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split("\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const data = trimmed.slice(5).trim()
            if (data === "[DONE]") {
              controller.close()
              return
            }
            try {
              const json = JSON.parse(data)
              const delta: unknown = json?.choices?.[0]?.delta?.content
              if (typeof delta === "string" && delta) {
                controller.enqueue(encoder.encode(delta.replace(/\*/g, "")))
              }
            } catch {
              // ignore keep-alive / non-JSON lines
            }
          }
        }
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })
}

const PLATFORM_PROMPT =
  "You are the AfyaSolar Intelligence assistant for solar-powered health facilities in Africa. " +
  "You help facility managers, NGOs and district officers understand their dashboards: solar power, " +
  "the cold chain (vaccine fridge), the Resilience Capacity Score, and the Climate Outlook. " +
  "Climate Outlook uses real NASA POWER data. Each 0-100 hazard index (heat, flood, storm, drought) is " +
  "calibrated to the facility's own ~30-year local climate record - it blends how unusual the recent value " +
  "is versus that history with its absolute severity, so a high score means 'high AND unusual for here'. " +
  "For heat and flood we also show an empirical return period (e.g. a 1-in-20-year level) from the local record. " +
  "The Climate Vulnerability Index (CVI) averages the four hazards; Hazard Exposure in the score is 100 minus the CVI. " +
  "Projections to 2030/2050 are a trend extrapolation of the real baseline with an uncertainty band - clearly NOT a forecast. " +
  "The Resilience Capacity Score is real only when a facility has completed its assessment; if it hasn't, say it is not yet assessed rather than inventing one. " +
  "Explain things simply for users with limited data-interpretation skills: short sentences, plain words, " +
  "concrete meaning ('high heat exposure means more fridge cooling load and spoilage risk'). " +
  "Never invent numbers beyond what the context provides. Reply in the user's language. " +
  "Do not use markdown or asterisk characters."

const INTERPRET_SUFFIX =
  " The user just loaded or changed climate data. Interpret the provided figures: say what the trend and " +
  "pattern mean, which hazard is most concerning and why, and one practical implication for the facility. " +
  "Keep it under 130 words."

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = session.user.id

    // Per-user rate limiting (protects the provider keys / spend). Two windows:
    // a burst cap per minute and a soft daily cap. In-memory / per-instance.
    const perMin = rateLimit(`ai:min:${userId}`, { windowMs: 60_000, maxRequests: RATE_PER_MIN })
    const perDay = rateLimit(`ai:day:${userId}`, { windowMs: 86_400_000, maxRequests: RATE_PER_DAY })
    if (!perMin.allowed || !perDay.allowed) {
      const retryMs = (!perMin.allowed ? perMin.resetTime : perDay.resetTime) - Date.now()
      return NextResponse.json(
        { error: "You're sending messages too quickly. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(retryMs / 1000))) } },
      )
    }

    const raw = await req.json().catch(() => null)
    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }
    const body = parsed.data
    const mode = body.mode === "interpret" ? "interpret" : "chat"
    const wantsStream = body.stream === true

    // Keep only user/assistant turns, cap each message length, cap history depth.
    const turns: ChatMessage[] = body.messages
      .filter((m): m is ChatMessage => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }))
      .slice(-MAX_HISTORY_TURNS)

    if (turns.length === 0) {
      return NextResponse.json({ error: "no valid messages" }, { status: 400 })
    }

    const context = typeof body.context === "string" ? body.context.trim() : ""
    const systemContent =
      PLATFORM_PROMPT +
      (mode === "interpret" ? INTERPRET_SUFFIX : "") +
      (context ? `\n\nContext:\n${context.slice(0, CONTEXT_CHAR_CAP)}` : "")

    const messages: ChatMessage[] = [{ role: "system", content: systemContent }, ...turns]
    const genOpts = {
      temperature: mode === "interpret" ? 0.3 : 0.5,
      maxTokens: mode === "interpret" ? 320 : 700,
    }

    const promptChars = messages.reduce((n, m) => n + m.content.length, 0)
    const ip = getClientIdentifier(req)
    const userAgent = req.headers.get("user-agent") ?? undefined

    if (wantsStream) {
      const { provider, model, upstream } = await openChatStream(messages, genOpts)
      // Best-effort usage log (completion size not captured on the stream path).
      void logAudit({
        userId,
        action: "ai.assistant",
        resource: "ai",
        details: { provider, model, mode, streamed: true, promptChars },
        ipAddress: ip,
        userAgent,
        success: true,
      })
      return new Response(toTextStream(upstream), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Ai-Provider": provider,
        },
      })
    }

    const { text, provider, model, usage } = await chatComplete(messages, genOpts)
    void logAudit({
      userId,
      action: "ai.assistant",
      resource: "ai",
      details: {
        provider,
        model,
        mode,
        streamed: false,
        promptChars,
        completionChars: text.length,
        usage,
      },
      ipAddress: ip,
      userAgent,
      success: true,
    })
    return NextResponse.json({ reply: text, provider })
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("AI assistant error:", error)
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 })
  }
}
