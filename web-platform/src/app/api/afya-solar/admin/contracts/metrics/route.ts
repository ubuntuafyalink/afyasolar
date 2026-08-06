import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSubscribers } from '@/lib/db/afyasolar-subscribers-schema'
import { mapSubscriberToContract } from '@/lib/admin/contract-mapping'

export const dynamic = 'force-dynamic'

const PLAN_TYPES = ['cash', 'installment', 'paas'] as const
const STATUSES = ['active', 'expired', 'suspended', 'draft', 'terminated'] as const

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rows = await db.select().from(afyaSolarSubscribers)
    const contracts = rows.map(mapSubscriberToContract)
    const totalContracts = contracts.length

    const countByStatus = (s: string) => contracts.filter(c => c.status === s).length

    const totalValue = contracts.reduce((sum, c) => sum + (c.totalValue || 0), 0)

    // Monthly recurring revenue: active recurring (installment + paas) monthly amounts.
    const monthlyRecurringRevenue = rows.reduce((sum, row) => {
      const planType = (row.planType || '').toUpperCase()
      const isRecurring = planType === 'INSTALLMENT' || planType === 'PAAS'
      const isActive = (row.subscriptionStatus || '').toLowerCase() === 'active'
      if (isRecurring && isActive) {
        return sum + Number(row.monthlyPaymentAmount ?? 0)
      }
      return sum
    }, 0)

    // Contracts whose end date falls within the next 30 days.
    const now = Date.now()
    const horizon = now + 30 * 24 * 60 * 60 * 1000
    const contractsExpiringNextMonth = contracts.filter(c => {
      if (!c.endDate) return false
      const end = new Date(c.endDate).getTime()
      return end >= now && end <= horizon
    }).length

    const contractsByPlanType = PLAN_TYPES.map(type => {
      const ofType = contracts.filter(c => c.planType === type)
      const count = ofType.length
      return {
        type,
        count,
        value: ofType.reduce((sum, c) => sum + (c.totalValue || 0), 0),
        percentage: totalContracts ? round1((count / totalContracts) * 100) : 0,
      }
    })

    const contractsByStatus = STATUSES.map(status => {
      const count = countByStatus(status)
      return {
        status,
        count,
        percentage: totalContracts ? round1((count / totalContracts) * 100) : 0,
      }
    })

    const data = {
      totalContracts,
      activeContracts: countByStatus('active'),
      expiredContracts: countByStatus('expired'),
      suspendedContracts: countByStatus('suspended'),
      draftContracts: countByStatus('draft'),
      totalValue,
      monthlyRecurringRevenue,
      contractsExpiringNextMonth,
      contractsByPlanType,
      contractsByStatus,
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        generatedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Error fetching contract metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract metrics' },
      { status: 500 }
    )
  }
}
