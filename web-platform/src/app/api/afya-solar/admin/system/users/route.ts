import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarAdminUsers } from '@/lib/db/afya-solar-schema'
import { desc } from 'drizzle-orm'
import { generateId } from '@/lib/utils'
import { ensureAdminTables } from '@/lib/db/ensure-admin-tables'
import { logAdminAction } from '@/lib/admin/admin-log'

export const dynamic = 'force-dynamic'

interface AdminUser {
  id: string
  name: string
  email: string
  role: 'super_admin' | 'admin' | 'support' | 'viewer'
  status: 'active' | 'inactive' | 'suspended'
  lastLogin?: string
  createdAt: string
  permissions: string[]
}

function mapUser(row: typeof afyaSolarAdminUsers.$inferSelect): AdminUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: (row.role as AdminUser['role']),
    status: (row.status as AdminUser['status']),
    lastLogin: row.lastLogin ? new Date(row.lastLogin).toISOString() : undefined,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
    permissions: Array.isArray(row.permissions) ? (row.permissions as string[]) : [],
  }
}

function getDefaultPermissions(role: string): string[] {
  switch (role) {
    case 'super_admin':
      return ['all']
    case 'admin':
      return ['users.read', 'users.write', 'analytics.read', 'config.read', 'config.write']
    case 'support':
      return ['tickets.read', 'tickets.write', 'customers.read', 'energy.read']
    case 'viewer':
      return ['analytics.read', 'energy.read', 'customers.read']
    default:
      return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureAdminTables()

    const rows = await db
      .select()
      .from(afyaSolarAdminUsers)
      .orderBy(desc(afyaSolarAdminUsers.createdAt))

    const users = rows.map(mapUser)

    return NextResponse.json({
      success: true,
      data: users,
      meta: {
        count: users.length,
      },
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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
    const { name, email, role, permissions } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, role' },
        { status: 400 }
      )
    }

    await ensureAdminTables()

    const newUser: AdminUser = {
      id: generateId(),
      name,
      email,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
      permissions: permissions || getDefaultPermissions(role),
    }

    await db.insert(afyaSolarAdminUsers).values({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      permissions: newUser.permissions as unknown,
    })

    await logAdminAction({
      category: 'system',
      message: `Admin user created: ${newUser.email} (${newUser.role})`,
      userId: session.user.id,
      metadata: { userId: newUser.id, role: newUser.role },
    })

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    })

  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
