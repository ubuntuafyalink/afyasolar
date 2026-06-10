import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarAdminConfigs } from '@/lib/db/afya-solar-schema'
import { eq } from 'drizzle-orm'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'
import { logAdminAction } from '@/lib/admin/admin-log'

export const dynamic = 'force-dynamic'

interface SystemConfig {
  id: string
  category: 'general' | 'security' | 'notifications' | 'automation' | 'integrations'
  key: string
  value: string | boolean | number
  description: string
  type: 'string' | 'boolean' | 'number' | 'select'
  options?: string[]
}

// Coerce the stored string value back to its declared type for the response.
function coerceValue(raw: string | null, type: string): string | boolean | number {
  const value = raw ?? ''
  if (type === 'boolean') {
    return value === 'true' || value === '1'
  }
  if (type === 'number') {
    const n = Number(value)
    return Number.isNaN(n) ? 0 : n
  }
  return value
}

// Serialize an incoming value to its stored string form.
function serializeValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value === null || value === undefined) return ''
  return String(value)
}

function mapConfig(row: typeof afyaSolarAdminConfigs.$inferSelect): SystemConfig {
  return {
    id: row.id,
    category: (row.category as SystemConfig['category']),
    key: row.configKey,
    value: coerceValue(row.configValue, row.type),
    description: row.description ?? '',
    type: (row.type as SystemConfig['type']),
    options: Array.isArray(row.options) ? (row.options as string[]) : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureAdminTables()

    const rows = await db.select().from(afyaSolarAdminConfigs)
    const configs = rows.map(mapConfig)

    return NextResponse.json({
      success: true,
      data: configs,
      meta: {
        count: configs.length,
      },
    })

  } catch (error) {
    console.error('Error fetching system config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system configuration' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { configId, value } = body

    if (!configId) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      )
    }

    await ensureAdminTables()

    const existing = await db
      .select()
      .from(afyaSolarAdminConfigs)
      .where(eq(afyaSolarAdminConfigs.id, configId))
      .limit(1)

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      )
    }

    await db
      .update(afyaSolarAdminConfigs)
      .set({ configValue: serializeValue(value) })
      .where(eq(afyaSolarAdminConfigs.id, configId))

    const updated = await db
      .select()
      .from(afyaSolarAdminConfigs)
      .where(eq(afyaSolarAdminConfigs.id, configId))
      .limit(1)

    const mapped = mapConfig(updated[0])

    await logAdminAction({
      category: 'system',
      message: `System config updated: ${mapped.key}`,
      userId: session.user.id,
      metadata: { configId, value: mapped.value },
    })

    return NextResponse.json({
      success: true,
      data: mapped,
      message: 'Configuration updated successfully',
    })

  } catch (error) {
    console.error('Error updating system config:', error)
    return NextResponse.json(
      { error: 'Failed to update system configuration' },
      { status: 500 }
    )
  }
}
