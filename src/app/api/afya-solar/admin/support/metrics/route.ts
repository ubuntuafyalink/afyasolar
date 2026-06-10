import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSupportTickets, afyaSolarSupportResponses } from '@/lib/db/afya-solar-schema'
import { asc } from 'drizzle-orm'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'

export const dynamic = 'force-dynamic'

const CATEGORIES = ['technical', 'billing', 'installation', 'maintenance', 'general'] as const
const PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureAdminTables()

    const tickets = await db.select().from(afyaSolarSupportTickets)
    const responses = await db
      .select()
      .from(afyaSolarSupportResponses)
      .orderBy(asc(afyaSolarSupportResponses.createdAt))

    const totalTickets = tickets.length
    const openTickets = tickets.filter(t => t.status === 'open').length
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length
    const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

    // First response time per ticket (hours from ticket creation to first response)
    const firstResponseAt = new Map<string, number>()
    for (const r of responses) {
      if (!r.createdAt) continue
      const ts = new Date(r.createdAt).getTime()
      const existing = firstResponseAt.get(r.ticketId)
      if (existing === undefined || ts < existing) {
        firstResponseAt.set(r.ticketId, ts)
      }
    }

    const responseDeltas: number[] = []
    const resolutionDeltas: number[] = []
    for (const t of tickets) {
      const created = t.createdAt ? new Date(t.createdAt).getTime() : null
      if (created !== null) {
        const fr = firstResponseAt.get(t.id)
        if (fr !== undefined && fr >= created) {
          responseDeltas.push((fr - created) / (1000 * 60 * 60))
        }
        if (t.resolvedAt) {
          const resolved = new Date(t.resolvedAt).getTime()
          if (resolved >= created) {
            resolutionDeltas.push((resolved - created) / (1000 * 60 * 60))
          }
        }
      }
    }

    const avgResponseTime = responseDeltas.length
      ? round1(responseDeltas.reduce((a, b) => a + b, 0) / responseDeltas.length)
      : 0
    const avgResolutionTime = resolutionDeltas.length
      ? round1(resolutionDeltas.reduce((a, b) => a + b, 0) / resolutionDeltas.length)
      : 0

    const ticketsByCategory = CATEGORIES.map(category => {
      const count = tickets.filter(t => t.category === category).length
      return {
        category,
        count,
        percentage: totalTickets ? round1((count / totalTickets) * 100) : 0,
      }
    })

    const ticketsByPriority = PRIORITIES.map(priority => {
      const count = tickets.filter(t => t.priority === priority).length
      return {
        priority,
        count,
        percentage: totalTickets ? round1((count / totalTickets) * 100) : 0,
      }
    })

    const data = {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      avgResponseTime,
      avgResolutionTime,
      customerSatisfaction: 0, // no rating source yet
      ticketsByCategory,
      ticketsByPriority,
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Error fetching support metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support metrics' },
      { status: 500 }
    )
  }
}
