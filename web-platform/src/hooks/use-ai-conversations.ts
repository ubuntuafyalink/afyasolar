"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type ConversationListItem = {
  id: string
  title: string | null
  messageCount: number
  updatedAt: string
}

export type ConversationMessage = { id: string; role: "user" | "assistant"; content: string; createdAt: string }

const LIST_KEY = ["ai-conversations"] as const

async function jsonOrThrow(res: Response) {
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(json?.error || "Request failed")
  return json
}

/** List the current user's conversations (newest first). */
export function useConversations() {
  return useQuery<ConversationListItem[]>({
    queryKey: LIST_KEY,
    queryFn: async () => {
      const res = await fetch("/api/ai/conversations")
      const json = await jsonOrThrow(res)
      return (json.conversations ?? []) as ConversationListItem[]
    },
    staleTime: 30_000,
  })
}

/** Load one conversation's messages (enabled when an id is selected). */
export function useConversationMessages(id: string | null) {
  return useQuery<ConversationMessage[]>({
    queryKey: ["ai-conversation", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/ai/conversations/${id}`)
      const json = await jsonOrThrow(res)
      return (json.messages ?? []) as ConversationMessage[]
    },
  })
}

/** Mutations for create / rename / delete / append, with cache invalidation. */
export function useConversationMutations() {
  const qc = useQueryClient()
  const invalidateList = () => qc.invalidateQueries({ queryKey: LIST_KEY })

  const create = useMutation({
    mutationFn: async (title?: string) => {
      const res = await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      return (await jsonOrThrow(res)) as { id: string; title: string | null }
    },
    onSuccess: invalidateList,
  })

  const rename = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const res = await fetch(`/api/ai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
      return jsonOrThrow(res)
    },
    onSuccess: invalidateList,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" })
      return jsonOrThrow(res)
    },
    onSuccess: invalidateList,
  })

  /** Persist completed turns; not a React Query mutation so it can run after a stream. */
  const appendMessages = async (
    id: string,
    messages: { role: "user" | "assistant"; content: string; provider?: string }[],
  ) => {
    try {
      await fetch(`/api/ai/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })
    } catch {
      // best-effort persistence; ignore failures
    } finally {
      invalidateList()
      qc.invalidateQueries({ queryKey: ["ai-conversation", id] })
    }
  }

  return { create, rename, remove, appendMessages }
}
