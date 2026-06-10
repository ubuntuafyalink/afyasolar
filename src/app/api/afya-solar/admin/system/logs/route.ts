import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSystemLogs } from '@/lib/db/afya-solar-schema'
import { and, eq, desc, sql } from 'drizzle-orm'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'

export const dynamic = 'force-dynamic'

interface SystemLog {
  id: string
  level: 'info' | 'warning' | 'error' | 'debug'
  category: string
  message: string
  userId?: string
  ipAddress?: string
  timestamp: string
  metadata?: Record<string, any>
}

function mapLog(row: typeof afyaSolarSystemLogs.$inferSelect): SystemLog {
  return {
    id: row.id,
    level: (row.level as SystemLog['level']),
    category: row.category,
    message: row.message,
    userId: row.userId ?? undefined,
    ipAddress: row.ipAddress ?? undefined,
    timestamp: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    metadata: (row.metadata as Record<string, any>) ?? undefined,
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
    const level = searchParams.get('level') || 'all'
    const category = searchParams.get('category') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100')

    const conditions = []
    if (level !== 'all') {
      conditions.push(eq(afyaSolarSystemLogs.level, level))
    }
    if (category !== 'all') {
      conditions.push(eq(afyaSolarSystemLogs.category, category))
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(afyaSolarSystemLogs)
      .where(whereClause)
      .orderBy(desc(afyaSolarSystemLogs.createdAt))
      .limit(limit)

    const totalRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(afyaSolarSystemLogs)
    const total = Number(totalRows[0]?.count ?? 0)

    const logs = rows.map(mapLog)

    return NextResponse.json({
      success: true,
      data: logs,
      meta: {
        count: logs.length,
        total,
        filters: { level, category, limit },
      },
    })

  } catch (error) {
    console.error('Error fetching system logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system logs' },
      { status: 500 }
    )
  }
}
