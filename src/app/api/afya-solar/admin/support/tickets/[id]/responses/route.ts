import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSupportTickets, afyaSolarSupportResponses } from '@/lib/db/afya-solar-schema'
import { eq } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'
import { logAdminAction } from '@/lib/admin/admin-log'

export const dynamic = 'force-dynamic'

interface SupportResponse {
  id: string
  ticketId: string
  message: string
  isInternal: boolean
  createdBy: string
  createdAt: string
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: ticketId } = await params
    const body = await request.json()
    const { message, isInternal } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    await ensureAdminTables()

    const newResponse: SupportResponse = {
      id: generateId(),
      ticketId,
      message,
      isInternal: isInternal || false,
      createdBy: session.user.id || 'admin',
      createdAt: new Date().toISOString(),
    }

    await db.insert(afyaSolarSupportResponses).values({
      id: newResponse.id,
      ticketId: newResponse.ticketId,
      message: newResponse.message,
      isInternal: newResponse.isInternal ? 1 : 0,
      createdBy: newResponse.createdBy,
    })

    // Bump the parent ticket's updated_at so it surfaces as recently active
    await db
      .update(afyaSolarSupportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(afyaSolarSupportTickets.id, ticketId))

    await logAdminAction({
      category: 'support',
      message: `Response added to ticket ${ticketId}`,
      userId: session.user.id,
      metadata: { ticketId, isInternal: newResponse.isInternal },
    })

    return NextResponse.json({
      success: true,
      data: newResponse,
      message: 'Response added successfully',
    })

  } catch (error) {
    console.error('Error adding response:', error)
    return NextResponse.json(
      { error: 'Failed to add response' },
      { status: 500 }
    )
  }
}
