"use client"

import { useMemo, useRef, useState } from "react"
import { Bot, Check, Mic, MessageSquarePlus, Pencil, SendHorizonal, Trash2, User, X } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { COPILOT_SUGGESTIONS, answerCopilot } from "@/lib/dashboard/facility-demo-data"
import { streamAssistant, type AssistantTurn } from "@/hooks/use-assistant"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useConversations, useConversationMutations } from "@/hooks/use-ai-conversations"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import {
  resolveCoords,
  rangeForPreset,
  toSolarResource,
  SOLAR_PARAMETERS,
} from "@/lib/climate/nasa-power"
import { useNasaPower } from "@/hooks/use-nasa-power"
import { deriveEnergyProfile, DEFAULT_ENERGY_PROFILE, BATTERY_DOD } from "@/lib/dashboard/power-model"
import type { MeuSummary, SizingSummary } from "@/components/solar/afya-solar-sizing-tool"
import { useFacilityPreferences } from "./facility-preferences-provider"

type Message = { role: "user" | "assistant"; text: string }
const GREETING: Message = {
  role: "assistant",
  text: "Hello! I'm your AfyaSolar assistant. Ask me about your fridge, today's power, expected solar, or how much you could save with solar.",
}
const EXTRA_SUGGESTIONS = ["How can I cut my energy bill?", "Will my fridge survive tonight?"]

/**
 * Conversation-aware AfyaSolar assistant: a history rail (new / select / rename
 * / delete) plus a streaming chat thread grounded in the facility's real
 * assessed energy + Climate Outlook data. Conversations and messages persist to
 * the database (per logged-in user); offline falls back to canned answers.
 */
export function AssistantChat({
  facilityId,
  meuSummary,
  sizingSummary,
  region,
}: {
  facilityId?: string
  meuSummary?: MeuSummary | null
  sizingSummary?: SizingSummary | null
  region?: string | null
}) {
  const { locale } = useFacilityPreferences()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognition = useSpeechRecognition({ lang: locale === "sw" ? "sw-TZ" : "en-US", onResult: setInput })

  const { data: conversations = [] } = useConversations()
  const { create, rename, remove, appendMessages } = useConversationMutations()

  // Ground the assistant in the facility's real energy + climate figures.
  const coords = useMemo(() => resolveCoords({ facilityId, region }), [facilityId, region])
  const range = useMemo(() => rangeForPreset("1y"), [])
  const climate = useNasaPower({
    lat: coords.lat,
    lon: coords.lon,
    temporal: range.temporal,
    start: range.start,
    end: range.end,
    parameters: SOLAR_PARAMETERS,
  })
  const facilityContext = useMemo(() => {
    const profile = deriveEnergyProfile(meuSummary, sizingSummary) ?? DEFAULT_ENERGY_PROFILE
    const solar = climate.data ? toSolarResource(climate.data) : null
    const psh = solar?.peakSunHours ?? 4.2
    const autonomyH =
      profile.criticalLoadKw > 0 ? (profile.batteryCapacityKwh * BATTERY_DOD * 0.9) / profile.criticalLoadKw : 0
    return (
      `Facility id: ${facilityId ?? "unknown"}. ` +
      `Sized solar ${profile.solarCapacityKw} kW, daily load ${(profile.avgLoadKw * 24).toFixed(1)} kWh, ` +
      `usable battery ${profile.batteryCapacityKwh} kWh, critical load ${profile.criticalLoadKw} kW, ` +
      `peak sun hours ${psh.toFixed(1)} (${solar?.sky ?? "partly"}), ` +
      `critical-load battery autonomy about ${autonomyH.toFixed(1)} hours.`
    )
  }, [facilityId, meuSummary, sizingSummary, climate.data])

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }))
  }

  function newChat() {
    setActiveId(null)
    setMessages([GREETING])
    setInput("")
  }

  async function openConversation(id: string) {
    if (id === activeId || busy) return
    setActiveId(id)
    setLoadingThread(true)
    try {
      const res = await fetch(`/api/ai/conversations/${id}`)
      const json = await res.json().catch(() => null)
      const loaded: Message[] = (json?.messages ?? []).map((m: { role: Message["role"]; content: string }) => ({
        role: m.role,
        text: m.content,
      }))
      setMessages(loaded.length ? loaded : [GREETING])
    } catch {
      setMessages([GREETING])
    } finally {
      setLoadingThread(false)
      scrollToEnd()
    }
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return

    // Ensure a conversation exists.
    let convId = activeId
    if (!convId) {
      try {
        const created = await create.mutateAsync(undefined)
        convId = created.id
        setActiveId(convId)
      } catch {
        convId = null // persistence unavailable; chat still works in-session
      }
    }

    const history: AssistantTurn[] = [
      ...messages.filter((m) => m.text).map((m) => ({ role: m.role, content: m.text })),
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

    let replyText = ""
    try {
      replyText = await streamAssistant({ messages: history, context: facilityContext, mode: "chat" }, setLastAssistant)
    } catch {
      replyText = answerCopilot(trimmed, facilityId)
      setLastAssistant(replyText)
    } finally {
      setBusy(false)
    }

    if (convId && replyText) {
      void appendMessages(convId, [
        { role: "user", content: trimmed },
        { role: "assistant", content: replyText },
      ])
    }
  }

  function toggleMic() {
    if (recognition.listening) recognition.stop()
    else recognition.start()
  }

  function saveRename(id: string) {
    const t = editTitle.trim()
    if (t) rename.mutate({ id, title: t })
    setEditingId(null)
    setEditTitle("")
  }

  function deleteConversation(id: string) {
    remove.mutate(id)
    if (id === activeId) newChat()
  }

  return (
    <Card className="grid h-full grid-cols-1 overflow-hidden lg:grid-cols-[16rem_1fr]">
      {/* History rail */}
      <aside className="flex max-h-[28rem] flex-col gap-2 border-b border-border bg-muted/30 p-3 lg:max-h-none lg:border-b-0 lg:border-r">
        <Button onClick={newChat} className="w-full justify-start gap-2" size="sm">
          <MessageSquarePlus className="size-4" aria-hidden /> New chat
        </Button>
        <div className="flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No saved chats yet.</p>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId
              const isEditing = c.id === editingId
              return (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    isActive ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  {isEditing ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveRename(c.id)}
                        className="h-7 text-xs"
                        aria-label="Rename conversation"
                        autoFocus
                      />
                      <button type="button" onClick={() => saveRename(c.id)} aria-label="Save" className={cn("p-1 text-success", FOCUS_RING)}>
                        <Check className="size-3.5" aria-hidden />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} aria-label="Cancel" className={cn("p-1 text-muted-foreground", FOCUS_RING)}>
                        <X className="size-3.5" aria-hidden />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => openConversation(c.id)}
                        className={cn("flex min-w-0 flex-1 items-center gap-1.5 text-left", FOCUS_RING)}
                      >
                        <MessageSquarePlus className="size-3.5 shrink-0 opacity-0" aria-hidden />
                        <span className="truncate">{c.title || "New conversation"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id)
                          setEditTitle(c.title || "")
                        }}
                        aria-label="Rename"
                        className={cn("p-1 opacity-0 transition-opacity group-hover:opacity-100", FOCUS_RING)}
                      >
                        <Pencil className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteConversation(c.id)}
                        aria-label="Delete"
                        className={cn("p-1 text-destructive opacity-0 transition-opacity group-hover:opacity-100", FOCUS_RING)}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* Thread */}
      <div className="flex min-h-[24rem] flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Bot className="size-5 text-primary" aria-hidden />
          <span className="text-base font-semibold text-foreground">AfyaSolar assistant</span>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {loadingThread ? (
            <p className="text-xs text-muted-foreground">Loading conversation...</p>
          ) : (
            messages.map((m, i) => (
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
            ))
          )}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {[...COPILOT_SUGGESTIONS, ...EXTRA_SUGGESTIONS].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                disabled={busy}
                className={cn(
                  "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50",
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
        </div>
      </div>
    </Card>
  )
}
