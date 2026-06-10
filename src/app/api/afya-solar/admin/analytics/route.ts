import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { afyaSolarSubscribers } from '@/lib/db/afyasolar-subscribers-schema'
import { payments } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function windowDays(timeRange: string): number {
  switch (timeRange) {
    case '90d':
      return 90
    case '1y':
      return 365
    case 'all':
      return 365 * 50 // effectively all-time
    case '30d':
    default:
      return 30
  }
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0
  return round1(((current - previous) / previous) * 100)
}

// Sum produced energy (kWh) from the efficiency table since a given date string.
// Best-effort: the table may not exist / be empty, in which case energy is 0.
async function energyKwhSince(dateStr: string): Promise<number> {
  try {
    const result = await db.execute(
      sql`SELECT COALESCE(SUM(produced_kwh), 0) AS kwh FROM \`facility_efficiency_daily\` WHERE \`snapshot_date\` >= ${dateStr}`
    )
    const rows = Array.isArray(result) ? (result[0] as unknown as Array<{ kwh: number | string }>) : []
    return Number(rows?.[0]?.kwh ?? 0)
  } catch {
    return 0
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const timeRange = searchParams.get('timeRange') || '30d'

    const days = windowDays(timeRange)
    const nowMs = Date.now()
    const currentStart = nowMs - days * 24 * 60 * 60 * 1000
    const previousStart = nowMs - 2 * days * 24 * 60 * 60 * 1000
    const dateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10)

    // Real source rows
    const subscribers = await db.select().from(afyaSolarSubscribers)
    const completedPayments = await db
      .select({ amount: payments.amount, createdAt: payments.createdAt })
      .from(payments)
      .where(eq(payments.status, 'completed'))

    // --- Revenue (real, from completed payments) ---
    let revenueCurrent = 0
    let revenuePrevious = 0
    for (const p of completedPayments) {
      const ts = p.createdAt ? new Date(p.createdAt).getTime() : 0
      const amount = Number(p.amount ?? 0)
      if (ts >= currentStart) revenueCurrent += amount
      else if (ts >= previousStart) revenuePrevious += amount
    }

    // --- Customers (real, subscriber counts) ---
    const totalCustomers = subscribers.length
    const customersCurrent = subscribers.filter(s => {
      const ts = s.createdAt ? new Date(s.createdAt).getTime() : 0
      return ts >= currentStart
    }).length
    const customersPrevious = subscribers.filter(s => {
      const ts = s.createdAt ? new Date(s.createdAt).getTime() : 0
      return ts >= previousStart && ts < currentStart
    }).length

    // --- Energy (best-effort from efficiency table; MWh) ---
    const energyCurrentKwh = await energyKwhSince(dateStr(currentStart))
    const energyAllKwh = await energyKwhSince(dateStr(previousStart))
    const energyPreviousKwh = Math.max(0, energyAllKwh - energyCurrentKwh)
    const energyCurrentMwh = round1(energyCurrentKwh / 1000)
    const energyPreviousMwh = round1(energyPreviousKwh / 1000)

    // --- System health (derived proxies from subscriber status) ---
    const activeSystems = subscribers.filter(s => (s.systemStatus || '').toLowerCase() === 'active').length
    const activeServices = subscribers.filter(s => (s.subscriptionStatus || '').toLowerCase() === 'active').length
    const meterSubscribers = subscribers.filter(s => !!s.smartmeterSerial)
    const metersTotal = meterSubscribers.length
    const metersOnline = meterSubscribers.filter(s => (s.systemStatus || '').toLowerCase() === 'active').length
    const systemUptime = totalCustomers ? round1((activeSystems / totalCustomers) * 100) : 0

    // --- Geographic (real: group subscribers by region) ---
    const regionMap = new Map<string, { customers: number; revenue: number }>()
    for (const s of subscribers) {
      const region = s.facilityRegion || 'Unknown'
      const entry = regionMap.get(region) || { customers: 0, revenue: 0 }
      entry.customers += 1
      entry.revenue += Number(s.totalPackagePrice ?? 0)
      regionMap.set(region, entry)
    }
    const geographic = Array.from(regionMap.entries())
      .map(([region, v]) => ({
        region,
        customers: v.customers,
        revenue: v.revenue,
        energyGenerated: 0, // no per-region energy source yet
        percentage: totalCustomers ? round1((v.customers / totalCustomers) * 100) : 0,
      }))
      .sort((a, b) => b.customers - a.customers)

    // --- Top facilities (best-effort: ranked by contract value) ---
    const topFacilities = [...subscribers]
      .sort((a, b) => Number(b.totalPackagePrice ?? 0) - Number(a.totalPackagePrice ?? 0))
      .slice(0, 3)
      .map(s => ({
        name: s.facilityName,
        energyGenerated: 0, // no per-facility energy source yet
        efficiency: 0,
        uptime: (s.systemStatus || '').toLowerCase() === 'active' ? 100 : 0,
      }))

    // --- Package performance (real: group by package) ---
    const packageMap = new Map<string, { sales: number; revenue: number }>()
    for (const s of subscribers) {
      const name = s.packageName || 'Unknown Package'
      const entry = packageMap.get(name) || { sales: 0, revenue: 0 }
      entry.sales += 1
      entry.revenue += Number(s.totalPackagePrice ?? 0)
      packageMap.set(name, entry)
    }
    const packagePerformance = Array.from(packageMap.entries())
      .map(([name, v]) => ({
        name,
        sales: v.sales,
        revenue: v.revenue,
        satisfaction: 0, // no rating source yet
      }))
      .sort((a, b) => b.revenue - a.revenue)

    // --- Predictions (derived) ---
    const monthlyRecurringRevenue = subscribers.reduce((sum, s) => {
      const planType = (s.planType || '').toUpperCase()
      const isRecurring = planType === 'INSTALLMENT' || planType === 'PAAS'
      const isActive = (s.subscriptionStatus || '').toLowerCase() === 'active'
      return isRecurring && isActive ? sum + Number(s.monthlyPaymentAmount ?? 0) : sum
    }, 0)
    const horizon = nowMs + 30 * 24 * 60 * 60 * 1000
    const maintenanceAlerts = subscribers.filter(s => {
      const healthBad = ['warning', 'critical'].includes((s.systemHealth || '').toLowerCase())
      const dueSoon = s.nextMaintenanceDate
        ? new Date(s.nextMaintenanceDate).getTime() <= horizon
        : false
      return healthBad || dueSoon
    }).length

    const data = {
      overview: {
        totalRevenue: revenueCurrent,
        totalCustomers,
        totalEnergyGenerated: energyCurrentMwh,
        systemUptime,
        customerSatisfaction: 0, // no rating source yet
        marketPenetration: 0, // no market-size source yet
      },
      trends: {
        revenue: [
          { period: 'Current Period', value: revenueCurrent, change: pctChange(revenueCurrent, revenuePrevious) },
          { period: 'Previous Period', value: revenuePrevious, change: 0 },
        ],
        customers: [
          { period: 'Current Period', value: customersCurrent, change: pctChange(customersCurrent, customersPrevious) },
          { period: 'Previous Period', value: customersPrevious, change: 0 },
        ],
        energy: [
          { period: 'Current Period', value: energyCurrentMwh, change: pctChange(energyCurrentMwh, energyPreviousMwh) },
          { period: 'Previous Period', value: energyPreviousMwh, change: 0 },
        ],
        satisfaction: [
          { period: 'Current Period', value: 0, change: 0 },
          { period: 'Previous Period', value: 0, change: 0 },
        ],
      },
      geographic,
      performance: {
        topFacilities,
        packagePerformance,
        systemHealth: {
          overall: systemUptime,
          meters: {
            online: metersOnline,
            total: metersTotal,
            uptime: metersTotal ? round1((metersOnline / metersTotal) * 100) : 0,
          },
          services: {
            active: activeServices,
            total: totalCustomers,
            uptime: totalCustomers ? round1((activeServices / totalCustomers) * 100) : 0,
          },
        },
      },
      predictions: {
        nextMonthRevenue: monthlyRecurringRevenue,
        nextQuarterCustomers: customersCurrent,
        yearlyEnergyGrowth: pctChange(energyCurrentMwh, energyPreviousMwh),
        maintenanceAlerts,
      },
    }

    return NextResponse.json({
      success: true,
      data,
      meta: {
        timeRange,
        generatedAt: new Date().toISOString(),
      },
    })

  } catch (error) {
    console.error('Error fetching analytics data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
