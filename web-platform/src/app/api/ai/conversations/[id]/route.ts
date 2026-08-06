/**
 * A single AI conversation.
 *   GET    -> conversation + ordered messages
 *   PATCH  -> rename { title }
 *   DELETE -> delete the conversation and its messages
 * Auth-required; owner = session.user.id (admins allowed).
 */
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { and, asc, eq } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { aiConversations, aiMessages } from "@/lib/db/schema"
import { ensureAiChatTables } from "@/lib/db/ensure-ai-chat-tables"

type SessionUser = { id: string; role?: string }

async function requireOwnedConversation(user: SessionUser, id: string) {
  const [conv] = await db
    .select({ id: aiConversations.id, userId: aiConversations.userId, title: aiConversations.title })
    .from(aiConversations)
    .where(eq(aiConversations.id, id))
    .limit(1)
  if (!conv) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  if (user.role !== "admin" && conv.userId !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { conv }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()
    const { id } = await params
    const gate = await requireOwnedConversation(session.user as SessionUser, id)
    if ("error" in gate) return gate.error

    const messages = await db
      .select({ id: aiMessages.id, role: aiMessages.role, content: aiMessages.content, createdAt: aiMessages.createdAt })
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(asc(aiMessages.createdAt))

    return NextResponse.json({ conversation: gate.conv, messages })
  } catch (error) {
    console.error("[ai conversation GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()
    const { id } = await params
    const gate = await requireOwnedConversation(session.user as SessionUser, id)
    if ("error" in gate) return gate.error

    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : ""
    if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

    await db.update(aiConversations).set({ title }).where(eq(aiConversations.id, id))
    return NextResponse.json({ id, title })
  } catch (error) {
    console.error("[ai conversation PATCH]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()
    const { id } = await params
    const gate = await requireOwnedConversation(session.user as SessionUser, id)
    if ("error" in gate) return gate.error

    await db.delete(aiMessages).where(eq(aiMessages.conversationId, id))
    await db.delete(aiConversations).where(and(eq(aiConversations.id, id)))
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[ai conversation DELETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
