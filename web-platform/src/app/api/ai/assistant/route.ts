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

import { authOptions } from "@/lib/auth/config"
import { chatComplete, openChatStream, AiNotConfiguredError, type ChatMessage } from "@/lib/ai/provider"

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
  "Climate Outlook uses real NASA POWER data normalized to 0-100 hazard indices: " +
  "heat (from mean daily maximum temperature), flood (from peak precipitation), storm (from peak wind speed), " +
  "and drought (from the longest dry spell). The Climate Vulnerability Index (CVI) averages the four; " +
  "2050 is a simple linear projection, not a forecast. " +
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const incoming: unknown = body?.messages
    const context: unknown = body?.context
    const mode = body?.mode === "interpret" ? "interpret" : "chat"
    const wantsStream = body?.stream === true

    if (!Array.isArray(incoming) || incoming.length === 0) {
      return NextResponse.json({ error: "messages must be a non-empty array" }, { status: 400 })
    }

    const turns: ChatMessage[] = incoming
      .filter(
        (m: unknown): m is ChatMessage =>
          !!m &&
          typeof m === "object" &&
          (("role" in m && (m as ChatMessage).role === "user") || (m as ChatMessage).role === "assistant") &&
          typeof (m as ChatMessage).content === "string",
      )
      .slice(-12) // cap history sent upstream

    if (turns.length === 0) {
      return NextResponse.json({ error: "no valid messages" }, { status: 400 })
    }

    const systemContent =
      PLATFORM_PROMPT +
      (mode === "interpret" ? INTERPRET_SUFFIX : "") +
      (typeof context === "string" && context.trim() ? `\n\nContext:\n${context.trim().slice(0, 4000)}` : "")

    const messages: ChatMessage[] = [{ role: "system", content: systemContent }, ...turns]
    const genOpts = {
      temperature: mode === "interpret" ? 0.3 : 0.5,
      maxTokens: mode === "interpret" ? 320 : 700,
    }

    if (wantsStream) {
      const { provider, upstream } = await openChatStream(messages, genOpts)
      return new Response(toTextStream(upstream), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "X-Ai-Provider": provider,
        },
      })
    }

    const { text, provider } = await chatComplete(messages, genOpts)
    return NextResponse.json({ reply: text, provider })
  } catch (error) {
    if (error instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    console.error("AI assistant error:", error)
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 })
  }
}
