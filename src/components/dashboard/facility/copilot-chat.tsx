"use client"

import { useRef, useState } from "react"
import { Bot, SendHorizonal, User } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { COPILOT_SUGGESTIONS, answerCopilot } from "@/lib/dashboard/facility-demo-data"

type Message = { role: "user" | "assistant"; text: string }

/**
 * Spec 11.3: the GenAI co-pilot chat surface (English). Answers are canned and
 * grounded in the demo data.
 *
 * [data] — TODO: wire the real co-pilot (Whisper transcription + GenAI) per
 * spec Part 11 & 15.4. Nothing is sent over the network here.
 */
export function CopilotChat({ facilityId }: { facilityId?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hello! I'm your AfyaSolar assistant. Ask me about your fridge, today's power, expected solar, or how much you could save with solar.",
    },
  ])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const reply = answerCopilot(trimmed, facilityId)
    setMessages((prev) => [...prev, { role: "user", text: trimmed }, { role: "assistant", text: reply }])
    setInput("")
    // Scroll to the latest message after it renders.
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-5 text-primary" aria-hidden /> AfyaSolar assistant
          </CardTitle>
          <DemoDataBadge label="Demo responses" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div ref={scrollRef} className="max-h-80 min-h-48 flex-1 space-y-3 overflow-y-auto pr-1">
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
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            aria-label="Ask the assistant"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
            <SendHorizonal className="size-4" aria-hidden />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
