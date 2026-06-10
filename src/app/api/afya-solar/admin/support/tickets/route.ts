import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { facilities } from '@/lib/db/schema'
import { afyaSolarSupportTickets } from '@/lib/db/afya-solar-schema'
import { eq, and, desc, sql } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'
import { logAdminAction } from '@/lib/admin/admin-log'

export const dynamic = 'force-dynamic'

interface SupportTicket {
  id: string
  ticketNumber: string
  facilityId: string
  facilityName: string
  subject: string
  description: string
  category: 'technical' | 'billing' | 'installation' | 'maintenance' | 'general'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  assignedTo?: string
  createdBy: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
}

function mapTicket(row: typeof afyaSolarSupportTickets.$inferSelect): SupportTicket {
  return {
    id: row.id,
    ticketNumber: row.ticketNumber,
    facilityId: row.facilityId,
    facilityName: row.facilityName ?? 'Unknown Facility',
    subject: row.subject,
    description: row.description,
    category: (row.category as SupportTicket['category']),
    priority: (row.priority as SupportTicket['priority']),
    status: (row.status as SupportTicket['status']),
    assignedTo: row.assignedTo ?? undefined,
    createdBy: row.createdBy,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
    resolvedAt: row.resolvedAt ? new Date(row.resolvedAt).toISOString() : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureAdminTables()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const category = searchParams.get('category') || 'all'
    const priority = searchParams.get('priority') || 'all'

    const conditions = []
    if (status !== 'all') {
      conditions.push(eq(afyaSolarSupportTickets.status, status))
    }
    if (category !== 'all') {
      conditions.push(eq(afyaSolarSupportTickets.category, category))
    }
    if (priority !== 'all') {
      conditions.push(eq(afyaSolarSupportTickets.priority, priority))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(afyaSolarSupportTickets)
      .where(whereClause)
      .orderBy(desc(afyaSolarSupportTickets.createdAt))

    const tickets = rows.map(mapTicket)

    return NextResponse.json({
      success: true,
      data: tickets,
      meta: {
        count: tickets.length,
        filters: { status, category, priority },
      },
    })

  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { facilityId, subject, description, category, priority } = body

    if (!facilityId || !subject || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: facilityId, subject, description' },
        { status: 400 }
      )
    }

    await ensureAdminTables()

    // Get facility name
    const facility = await db
      .select({ name: facilities.name })
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1)

    const facilityName = facility[0]?.name || 'Unknown Facility'

    // Generate sequential ticket number for the current year
    const countRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(afyaSolarSupportTickets)
    const sequence = Number(countRows[0]?.count ?? 0) + 1
    const ticketNumber = `SOL-${new Date().getFullYear()}-${String(sequence).padStart(3, '0')}`

    const nowIso = new Date().toISOString()
    const newTicket: SupportTicket = {
      id: generateId(),
      ticketNumber,
      facilityId,
      facilityName,
      subject,
      description,
      category: category || 'general',
      priority: priority || 'medium',
      status: 'open',
      createdBy: session.user.id || 'admin',
      createdAt: nowIso,
      updatedAt: nowIso,
    }

    await db.insert(afyaSolarSupportTickets).values({
      id: newTicket.id,
      ticketNumber: newTicket.ticketNumber,
      facilityId: newTicket.facilityId,
      facilityName: newTicket.facilityName,
      subject: newTicket.subject,
      description: newTicket.description,
      category: newTicket.category,
      priority: newTicket.priority,
      status: newTicket.status,
      createdBy: newTicket.createdBy,
    })

    await logAdminAction({
      category: 'support',
      message: `Support ticket created: ${ticketNumber} (${facilityName})`,
      userId: session.user.id,
      metadata: { ticketId: newTicket.id, facilityId, priority: newTicket.priority },
    })

    return NextResponse.json({
      success: true,
      data: newTicket,
      message: 'Support ticket created successfully',
    })

  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}
