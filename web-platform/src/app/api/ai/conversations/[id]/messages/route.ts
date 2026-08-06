/**
 * Append messages to a conversation after a streamed turn completes.
 *   POST { messages: [{ role, content, provider? }] }
 * Bumps message_count + updated_at and auto-titles from the first user message.
 * Auth-required; owner = session.user.id (admins allowed).
 */
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getServerSession } from "next-auth"
import { eq, sql } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { aiConversations, aiMessages } from "@/lib/db/schema"
import { ensureAiChatTables } from "@/lib/db/ensure-ai-chat-tables"

type IncomingMessage = { role: "user" | "assistant"; content: string; provider?: string }

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()
    const { id } = await params

    const [conv] = await db
      .select({ id: aiConversations.id, userId: aiConversations.userId, title: aiConversations.title })
      .from(aiConversations)
      .where(eq(aiConversations.id, id))
      .limit(1)
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (session.user.role !== "admin" && conv.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const incoming: IncomingMessage[] = Array.isArray(body?.messages)
      ? body.messages.filter(
          (m: unknown): m is IncomingMessage =>
            !!m &&
            typeof m === "object" &&
            ((m as IncomingMessage).role === "user" || (m as IncomingMessage).role === "assistant") &&
            typeof (m as IncomingMessage).content === "string" &&
            (m as IncomingMessage).content.trim().length > 0,
        )
      : []
    if (incoming.length === 0) return NextResponse.json({ error: "No messages" }, { status: 400 })

    await db.insert(aiMessages).values(
      incoming.map((m) => ({
        id: randomUUID(),
        conversationId: id,
        userId: conv.userId,
        role: m.role,
        content: m.content.slice(0, 8000),
        provider: m.provider ?? null,
      })),
    )

    // Auto-title from the first user message when untitled.
    const firstUser = incoming.find((m) => m.role === "user")
    const newTitle =
      !conv.title && firstUser ? firstUser.content.trim().slice(0, 80) : conv.title ?? null

    await db
      .update(aiConversations)
      .set({ title: newTitle, messageCount: sql`${aiConversations.messageCount} + ${incoming.length}` })
      .where(eq(aiConversations.id, id))

    return NextResponse.json({ ok: true, title: newTitle })
  } catch (error) {
    console.error("[ai conversation messages POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
