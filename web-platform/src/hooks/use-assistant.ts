"use client"

import { useCallback, useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"

export type AssistantTurn = { role: "user" | "assistant"; content: string }

export type AssistantRequest = {
  messages: AssistantTurn[]
  context?: string
  mode?: "chat" | "interpret"
}

export type AssistantResponse = { reply: string; provider: string }

/**
 * Calls the auth-gated /api/ai/assistant route. Throws on failure so callers can
 * fall back (e.g. canned answers offline). Returns the reply text + provider.
 */
export function useAssistant() {
  return useMutation<AssistantResponse, Error, AssistantRequest>({
    mutationFn: async (req) => {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(json?.error || "Assistant request failed")
      }
      return json as AssistantResponse
    },
  })
}

/**
 * Streaming call to /api/ai/assistant (stream: true). Invokes onText with the
 * accumulated reply on every token delta, so the UI can render real-time
 * "AI typing". Resolves with the final text; throws so callers can fall back.
 */
export async function streamAssistant(
  req: AssistantRequest,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...req, stream: true }),
    signal,
  })
  if (!res.ok || !res.body) {
    const json = await res.json().catch(() => null)
    throw new Error(json?.error || "Assistant request failed")
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full = ""
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    full += decoder.decode(value, { stream: true })
    onText(full)
  }
  return full
}

/**
 * Hook wrapper around streamAssistant that tracks the live text + status, for
 * the interpretation cards. The text updates token-by-token as it streams.
 */
export function useStreamingAssistant() {
  const [text, setText] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [isError, setIsError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (req: AssistantRequest) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setText("")
    setIsError(false)
    setIsStreaming(true)
    try {
      await streamAssistant(req, setText, controller.signal)
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) setIsError(true)
    } finally {
      if (abortRef.current === controller) setIsStreaming(false)
    }
  }, [])

  return { text, isStreaming, isError, run }
}
