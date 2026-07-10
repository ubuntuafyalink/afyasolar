"use client"

import { useMemo, useRef, useState } from "react"
import {
  Bot,
  User,
  SendHorizonal,
  Square,
  Mic,
  MessageSquarePlus,
  Pencil,
  Trash2,
  Check,
  X,
  Copy,
  RotateCcw,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { streamAssistant, type AssistantTurn } from "@/hooks/use-assistant"
import { useConversations, useConversationMutations } from "@/hooks/use-ai-conversations"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { TypingCursor } from "@/components/assistant/typing-cursor"
import { useAdminPortfolio } from "@/hooks/use-admin-portfolio"
import { useAdminPortfolioClimate } from "@/hooks/use-admin-portfolio-climate"
import { buildAdminAssistantContextForQuery, buildAdminSuggestions } from "@/lib/assistant/admin-assistant-context"

type Message = { role: "user" | "assistant"; text: string }

const GREETING: Message = {
  role: "assistant",
  text:
    "Hi — I'm your portfolio assistant. Ask which facilities are most at risk, where to prioritise investment, or for a resilience summary. Answers are grounded in your live facility, climate and energy data.",
}

/**
 * Conversation-aware admin Assistant: a saved-chats rail plus a streaming chat
 * thread grounded in the REAL portfolio (facilities, RCS, NASA climate, energy).
 * Reuses the shared /api/ai/assistant streaming route and the user-scoped
 * conversation store.
 */
export function AdminAssistant() {
  const { facilities } = useAdminPortfolio()
  const climateQ = useAdminPortfolioClimate()
  const aggregate = climateQ.data?.aggregate ?? null

  const suggestions = useMemo(() => buildAdminSuggestions(facilities), [facilities])

  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([GREETING])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [loadingThread, setLoadingThread] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const recognition = useSpeechRecognition({ lang: "en-US", onResult: setInput })
  const { data: conversations = [] } = useConversations()
  const { create, rename, remove, appendMessages } = useConversationMutations()

  function scrollToEnd() {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }))
  }

  function newChat() {
    if (busy) return
    setActiveId(null)
    setMessages([GREETING])
    setInput("")
    setError(null)
  }

  async function openConversation(id: string) {
    if (id === activeId || busy) return
    setActiveId(id)
    setError(null)
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

  /** Stream an answer for `history` (the turns to send) into a trailing assistant bubble. */
  async function streamInto(history: AssistantTurn[], userText: string, convId: string | null) {
    setBusy(true)
    setError(null)
    scrollToEnd()
    const controller = new AbortController()
    abortRef.current = controller

    const setLastAssistant = (txt: string) => {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: "assistant", text: txt }
        return copy
      })
      scrollToEnd()
    }

    // Question-aware retrieval: pack the records most relevant to THIS question.
    const context = buildAdminAssistantContextForQuery(userText, facilities, aggregate)

    let replyText = ""
    try {
      replyText = await streamAssistant({ messages: history, context, mode: "chat" }, setLastAssistant, controller.signal)
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // user stopped — keep whatever streamed so far
      } else {
        setError("The assistant is unavailable right now. Please retry.")
        // drop the empty assistant placeholder so we don't show a blank bubble
        setMessages((prev) => (prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1].text ? prev.slice(0, -1) : prev))
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setBusy(false)
      }
    }

    if (convId && replyText) {
      void appendMessages(convId, [
        { role: "user", content: userText },
        { role: "assistant", content: replyText },
      ])
    }
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || busy) return

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
    await streamInto(history, trimmed, convId)
  }

  /** Re-answer the most recent user turn (used by Retry and Regenerate). */
  async function regenerate() {
    if (busy) return
    const withText = messages.filter((m) => m.text)
    const base = withText[withText.length - 1]?.role === "assistant" ? withText.slice(0, -1) : withText
    const lastUser = [...base].reverse().find((m) => m.role === "user")
    if (!lastUser) return
    const history: AssistantTurn[] = base.map((m) => ({ role: m.role, content: m.text }))
    setMessages([...base, { role: "assistant", text: "" }])
    await streamInto(history, lastUser.text, activeId)
  }

  function stop() {
    abortRef.current?.abort()
  }

  function copyMessage(idx: number, text: string) {
    void navigator.clipboard?.writeText(text)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx((cur) => (cur === idx ? null : cur)), 1500)
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

  const canRegenerate = !busy && messages.some((m) => m.role === "user")

  return (
    <Card className="grid h-[78vh] grid-cols-1 overflow-hidden lg:grid-cols-[16rem_1fr]">
      {/* History rail */}
      <aside className="flex max-h-[28rem] flex-col gap-2 border-b border-border bg-muted/30 p-3 lg:max-h-none lg:border-b-0 lg:border-r">
        <Button onClick={newChat} disabled={busy} className="w-full justify-start gap-2" size="sm">
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
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" aria-hidden />
            <div>
              <span className="block text-base font-semibold text-foreground">Portfolio assistant</span>
              <span className="block text-xs text-muted-foreground">Grounded in your live facility, climate &amp; energy data</span>
            </div>
          </div>
          {canRegenerate && (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={regenerate}>
              <RotateCcw className="size-3.5" aria-hidden /> Regenerate
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
          {loadingThread ? (
            <p className="text-xs text-muted-foreground">Loading conversation...</p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "group flex items-start gap-2 duration-200 animate-in fade-in slide-in-from-bottom-1 motion-reduce:animate-none",
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
                <div className={cn("flex max-w-[80%] flex-col gap-1", m.role === "user" && "items-end")}>
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                      m.role === "assistant"
                        ? "rounded-tl-sm bg-muted/60 text-foreground"
                        : "rounded-tr-sm bg-primary text-primary-foreground",
                    )}
                  >
                    {m.text}
                    {m.role === "assistant" && busy && i === messages.length - 1 ? <TypingCursor /> : null}
                  </p>
                  {m.role === "assistant" && m.text && !(busy && i === messages.length - 1) && (
                    <button
                      type="button"
                      onClick={() => copyMessage(i, m.text)}
                      className={cn(
                        "inline-flex items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100",
                        FOCUS_RING,
                      )}
                    >
                      {copiedIdx === i ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={regenerate}>
                <RotateCcw className="size-3.5" aria-hidden /> Retry
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-2 border-t border-border p-3">
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
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
            className="flex items-end gap-2"
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
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  send(input)
                }
              }}
              rows={1}
              placeholder="Ask about the portfolio..."
              aria-label="Ask the assistant"
              className={cn(
                "min-h-10 max-h-32 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                FOCUS_RING,
              )}
            />
            {busy ? (
              <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop">
                <Square className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
                <SendHorizonal className="size-4" aria-hidden />
              </Button>
            )}
          </form>
        </div>
      </div>
    </Card>
  )
}
