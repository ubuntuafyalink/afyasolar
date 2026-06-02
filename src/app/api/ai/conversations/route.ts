/**
 * AI chat conversations for the logged-in user.
 *   GET  -> list the user's conversations (newest first)
 *   POST -> create a new conversation, returns { id }
 * Auth-required; scoped to session.user.id.
 */
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getServerSession } from "next-auth"
import { desc, eq } from "drizzle-orm"

import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { aiConversations } from "@/lib/db/schema"
import { ensureAiChatTables } from "@/lib/db/ensure-ai-chat-tables"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()

    const rows = await db
      .select({
        id: aiConversations.id,
        title: aiConversations.title,
        messageCount: aiConversations.messageCount,
        updatedAt: aiConversations.updatedAt,
      })
      .from(aiConversations)
      .where(eq(aiConversations.userId, session.user.id))
      .orderBy(desc(aiConversations.updatedAt))
      .limit(100)

    return NextResponse.json({ conversations: rows })
  } catch (error) {
    console.error("[ai conversations GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    await ensureAiChatTables()

    const body = await req.json().catch(() => ({}))
    const title = typeof body?.title === "string" ? body.title.slice(0, 200) : null
    const id = randomUUID()

    await db.insert(aiConversations).values({
      id,
      userId: session.user.id,
      facilityId: session.user.facilityId ?? null,
      title,
      messageCount: 0,
    })

    return NextResponse.json({ id, title })
  } catch (error) {
    console.error("[ai conversations POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
