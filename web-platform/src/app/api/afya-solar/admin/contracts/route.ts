import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSubscribers } from '@/lib/db/afyasolar-subscribers-schema'
import { desc } from 'drizzle-orm'
import { mapSubscriberToContract } from '@/lib/admin/contract-mapping'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const planType = searchParams.get('planType') || 'all'

    // Source of truth: real subscriber rows, mapped to the Contract shape.
    const rows = await db
      .select()
      .from(afyaSolarSubscribers)
      .orderBy(desc(afyaSolarSubscribers.createdAt))

    let contracts = rows.map(mapSubscriberToContract)
    const total = contracts.length

    if (status !== 'all') {
      contracts = contracts.filter(contract => contract.status === status)
    }
    if (planType !== 'all') {
      contracts = contracts.filter(contract => contract.planType === planType)
    }

    return NextResponse.json({
      success: true,
      data: contracts,
      meta: {
        count: contracts.length,
        total,
        filters: { status, planType },
      },
    })

  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}
