"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Bot, Mic, SendHorizonal, Square, User, Volume2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { streamAssistant, type AssistantTurn } from "@/hooks/use-assistant"
import { useSpeech } from "@/hooks/use-speech"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { answerCopilot } from "@/lib/dashboard/facility-demo-data"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { useFacilityPreferences } from "@/components/dashboard/facility/facility-preferences-provider"

type Message = { role: "user" | "assistant"; text: string }

/**
 * Global floating AI assistant. Mounted app-wide (after children) and gated on
 * an authenticated session so the provider key cannot be abused anonymously.
 * Chat + voice (Web Speech STT/TTS), page-aware context, offline fallback to
 * the canned co-pilot answers.
 */
export function AssistantWidget() {
  const { status } = useSession()
  const { locale, t } = useFacilityPreferences()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const speech = useSpeech()
  const recognition = useSpeechRecognition({
    lang: locale === "sw" ? "sw-TZ" : "en-US",
    onResult: setInput,
  })

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    })
  }, [messages])

  if (status !== "authenticated") return null

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    const history: AssistantTurn[] = [
      ...messages.map((m) => ({ role: m.role, content: m.text })),
      { role: "user", content: trimmed },
    ]
    // Append the user turn plus an empty assistant bubble we stream into.
    setMessages((prev) => [...prev, { role: "user", text: trimmed }, { role: "assistant", text: "" }])
    setInput("")
    setBusy(true)

    const setLastAssistant = (txt: string) =>
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", text: txt }
        return copy
      })

    // Lightweight page grounding: path + document title + the main heading, so
    // the global assistant knows what the user is looking at.
    const context =
      typeof window !== "undefined"
        ? [
            `Current page: ${window.location.pathname}`,
            document.title ? `Page title: ${document.title}` : "",
            document.querySelector("h1")?.textContent?.trim()
              ? `Main heading: ${document.querySelector("h1")!.textContent!.trim().slice(0, 120)}`
              : "",
          ]
            .filter(Boolean)
            .join(". ")
        : undefined
    try {
      await streamAssistant({ messages: history, context, mode: "chat" }, setLastAssistant)
    } catch {
      setLastAssistant(answerCopilot(trimmed))
    } finally {
      setBusy(false)
    }
  }

  function toggleMic() {
    if (recognition.listening) recognition.stop()
    else recognition.start()
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("assistant.open")}
        className={cn(
          "fixed bottom-4 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105",
          FOCUS_RING,
        )}
      >
        <Bot className="size-6" aria-hidden />
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label={t("assistant.title")}
      className="fixed bottom-4 right-4 z-50 flex h-[32rem] max-h-[80vh] w-[22rem] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="flex items-center gap-2 font-semibold text-foreground">
          <Bot className="size-5 text-primary" aria-hidden /> {t("assistant.title")}
        </span>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("assistant.close")} className={cn("rounded-md p-1 hover:bg-muted", FOCUS_RING)}>
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("assistant.greeting")}</p>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}>
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full",
                m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}
            >
              {m.role === "assistant" ? <Bot className="size-4" aria-hidden /> : <User className="size-4" aria-hidden />}
            </span>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                m.role === "assistant" ? "rounded-tl-sm bg-muted/60 text-foreground" : "rounded-tr-sm bg-primary text-primary-foreground",
              )}
            >
              {m.text}
              {m.role === "assistant" && busy && i === messages.length - 1 ? <TypingCursor /> : null}
              {m.role === "assistant" && m.text && !(busy && i === messages.length - 1) && speech.supported ? (
                <button
                  type="button"
                  onClick={() => (speech.speaking ? speech.stop() : speech.speak(m.text, locale === "sw" ? "sw-TZ" : "en-US"))}
                  aria-label={speech.speaking ? t("toolbar.stop") : t("toolbar.readAloud")}
                  className={cn("ml-1 inline-flex align-middle text-muted-foreground", FOCUS_RING)}
                >
                  {speech.speaking ? <Square className="size-3" aria-hidden /> : <Volume2 className="size-3" aria-hidden />}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex items-center gap-1.5 border-t border-border px-3 py-3"
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
            aria-label={recognition.listening ? t("assistant.stopVoice") : t("assistant.voice")}
          >
            <Mic className="size-4" aria-hidden />
          </Button>
        ) : null}
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistant.placeholder")}
          aria-label={t("assistant.placeholder")}
        />
        <Button type="submit" size="icon" aria-label={t("assistant.send")} disabled={!input.trim() || busy}>
          <SendHorizonal className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  )
}
