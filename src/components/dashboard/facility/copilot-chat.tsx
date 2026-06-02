"use client"

import { useRef, useState } from "react"
import { Bot, Mic, SendHorizonal, User } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { COPILOT_SUGGESTIONS, answerCopilot } from "@/lib/dashboard/facility-demo-data"
import { streamAssistant, type AssistantTurn } from "@/hooks/use-assistant"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { useFacilityPreferences } from "./facility-preferences-provider"

type Message = { role: "user" | "assistant"; text: string }

/**
 * Spec 11.3: the GenAI co-pilot chat surface. Answers come from the real AI
 * assistant route (OpenAI, GROQ fallback); if that fails or the device is
 * offline it falls back to the canned demo answers so it always responds.
 * Supports voice input via the browser Web Speech API.
 */
export function CopilotChat({ facilityId }: { facilityId?: string }) {
  const { locale } = useFacilityPreferences()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I'm your AfyaSolar assistant. Ask me about your fridge, today's power, expected solar, or how much you could save with solar.",
    },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognition = useSpeechRecognition({
    lang: locale === "sw" ? "sw-TZ" : "en-US",
    onResult: setInput,
  })

  function scrollToEnd() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    const history: AssistantTurn[] = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: trimmed },
    ]
    setMessages((prev) => [...prev, { role: "user", text: trimmed }, { role: "assistant", text: "" }])
    setInput("")
    setBusy(true)
    scrollToEnd()

    const setLastAssistant = (txt: string) => {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", text: txt }
        return copy
      })
      scrollToEnd()
    }

    try {
      await streamAssistant(
        { messages: history, context: facilityId ? `Facility id: ${facilityId}` : undefined, mode: "chat" },
        setLastAssistant,
      )
    } catch {
      setLastAssistant(answerCopilot(trimmed, facilityId))
    } finally {
      setBusy(false)
    }
  }

  function toggleMic() {
    if (recognition.listening) recognition.stop()
    else recognition.start()
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-5 text-primary" aria-hidden /> AfyaSolar assistant
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div ref={scrollRef} className="max-h-80 min-h-48 flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none",
                m.role === "user" && "flex-row-reverse",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                )}
              >
                {m.role === "assistant" ? <Bot className="size-4" aria-hidden /> : <User className="size-4" aria-hidden />}
              </span>
              <p
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "assistant"
                    ? "rounded-tl-sm bg-muted/60 text-foreground"
                    : "rounded-tr-sm bg-primary text-primary-foreground",
                )}
              >
                {m.text}
                {m.role === "assistant" && busy && i === messages.length - 1 ? <TypingCursor /> : null}
              </p>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-1.5">
          {COPILOT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className={cn(
                "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted",
                FOCUS_RING,
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          {recognition.supported ? (
            <Button
              type="button"
              size="icon"
              variant={recognition.listening ? "default" : "outline"}
              onClick={toggleMic}
              aria-label={recognition.listening ? "Stop voice input" : "Start voice input"}
            >
              <Mic className="size-4" aria-hidden />
            </Button>
          ) : null}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            aria-label="Ask the assistant"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || busy}>
            <SendHorizonal className="size-4" aria-hidden />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
