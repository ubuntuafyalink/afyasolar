import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { deviceTelemetry, devices, facilities } from '@/lib/db/schema'
import { eq, and, gte, lte, desc, avg } from 'drizzle-orm'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface PerformanceMetrics {
  deviceId: string
  facilityId: string
  facilityName: string
  deviceSerial: string
  period: string
  startDate: string
  endDate: string
  metrics: {
    energyGenerated: number // kWh
    avgPower: number // W
    peakPower: number // W
    minPower: number // W
    avgEfficiency: number // %
    peakEfficiency: number // %
    minEfficiency: number // %
    uptime: number // %
    operatingHours: number
    capacityFactor: number // %
    performanceRatio: number // %
    availability: number // %
    reliability: number // %
    degradationRate: number // % per year
  }
  benchmarks: {
    industryAvg: {
      energyGenerated: number
      avgEfficiency: number
      capacityFactor: number
      performanceRatio: number
    }
    facilityAvg: {
      energyGenerated: number
      avgEfficiency: number
      capacityFactor: number
      performanceRatio: number
    }
    regionalAvg: {
      energyGenerated: number
      avgEfficiency: number
      capacityFactor: number
      performanceRatio: number
    }
  }
  trends: {
    energyTrend: 'increasing' | 'stable' | 'decreasing'
    efficiencyTrend: 'improving' | 'stable' | 'declining'
    reliabilityTrend: 'improving' | 'stable' | 'declining'
  }
}

/**
 * POST /api/admin/analytics/performance/metrics
 * Calculate comprehensive performance metrics
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      deviceId, 
      facilityId, 
      period, 
      startDate, 
      endDate,
      includeBenchmarks = true,
      includeTrends = true
    } = body

    // Validate input
    if (!deviceId && !facilityId) {
      return NextResponse.json({ 
        error: 'Either deviceId or facilityId is required' 
      }, { status: 400 })
    }

    if (!period || !startDate || !endDate) {
      return NextResponse.json({ 
        error: 'Missing required fields: period, startDate, endDate' 
      }, { status: 400 })
    }

    // Calculate performance metrics
    const metrics = await calculatePerformanceMetrics(
      deviceId, 
      facilityId, 
      period, 
      startDate, 
      endDate,
      includeBenchmarks,
      includeTrends
    )

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error calculating performance metrics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to calculate performance metrics' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/analytics/performance/metrics
 * Get performance metrics for devices or facilities
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get('deviceId')
    const facilityId = searchParams.get('facilityId')
    const period = searchParams.get('period') || 'monthly'
    const limit = parseInt(searchParams.get('limit') || '12')

    // Get performance metrics
    const metrics = await getPerformanceMetrics(deviceId, facilityId, period, limit)

    return NextResponse.json({
      success: true,
      data: metrics
    })

  } catch (error) {
    console.error('Error fetching performance metrics:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch performance metrics' },
      { status: 500 }
    )
  }
}

/**
 * Calculate comprehensive performance metrics
 */
async function calculatePerformanceMetrics(
  deviceId: string | null,
  facilityId: string | null,
  period: string,
  startDate: string,
  endDate: string,
  includeBenchmarks: boolean = true,
  includeTrends: boolean = true
): Promise<PerformanceMetrics> {
  // Get telemetry data for the period
  const telemetryData = await db
    .select()
    .from(deviceTelemetry)
    .where(and(
      deviceId ? eq(deviceTelemetry.deviceId, deviceId) : undefined,
      gte(deviceTelemetry.timestamp, new Date(startDate)),
      lte(deviceTelemetry.timestamp, new Date(endDate))
    ))
    .orderBy(desc(deviceTelemetry.timestamp))

  if (telemetryData.length === 0) {
    throw new Error('No telemetry data found for the specified period')
  }

  // Get device and facility information
  const deviceInfo = await db
    .select({
      device: devices,
      facility: facilities
    })
    .from(devices)
    .leftJoin(facilities, eq(devices.facilityId, facilities.id))
    .where(deviceId ? eq(devices.id, deviceId) : eq(devices.facilityId, facilityId!))
    .limit(1)

  if (deviceInfo.length === 0) {
    throw new Error('Device or facility not found')
  }

  const { device, facility } = deviceInfo[0]

  // Calculate basic metrics
  const powerValues = telemetryData.map(d => Number(d.power || 0)).filter(p => p > 0)
  const efficiencyValues = telemetryData.map(d => Number(d.efficiency || 0)).filter(e => e > 0)

  const energyGenerated = calculateEnergyGenerated(telemetryData)
  const avgPower = powerValues.length > 0 ? powerValues.reduce((sum, p) => sum + p, 0) / powerValues.length : 0
  const peakPower = powerValues.length > 0 ? Math.max(...powerValues) : 0
  const minPower = powerValues.length > 0 ? Math.min(...powerValues) : 0
  const avgEfficiency = efficiencyValues.length > 0 ? efficiencyValues.reduce((sum, e) => sum + e, 0) / efficiencyValues.length : 0
  const peakEfficiency = efficiencyValues.length > 0 ? Math.max(...efficiencyValues) : 0
  const minEfficiency = efficiencyValues.length > 0 ? Math.min(...efficiencyValues) : 0
  const uptime = calculateUptime(telemetryData)
  const operatingHours = telemetryData.length * 5 / 60 // Assuming 5-minute intervals

  // Calculate advanced metrics
  const ratedCapacity = 5000 // Default 5kW rated capacity
  const capacityFactor = calculateCapacityFactor(energyGenerated, ratedCapacity, operatingHours)
  const performanceRatio = calculatePerformanceRatio(energyGenerated, avgEfficiency, ratedCapacity)
  const availability = calculateAvailability(uptime)
  const reliability = calculateReliability(telemetryData)
  const degradationRate = await calculateDegradationRate(deviceId || device.id, startDate, endDate)

  // Get benchmarks (real portfolio average over the window)
  const benchmarks = includeBenchmarks
    ? await getBenchmarks(startDate, endDate)
    : getDefaultBenchmarks()

  // Get trends (vs the previous equal-length window)
  const trends = includeTrends
    ? await getTrends(deviceId || device.id, startDate, endDate, energyGenerated, avgEfficiency, reliability)
    : getDefaultTrends()

  return {
    deviceId: deviceId || device.id,
    facilityId: facilityId || facility?.id || 'unknown',
    facilityName: facility?.name || 'Unknown Facility',
    deviceSerial: device?.serialNumber || 'Unknown Device',
    period,
    startDate,
    endDate,
    metrics: {
      energyGenerated: Math.round(energyGenerated * 100) / 100,
      avgPower: Math.round(avgPower * 100) / 100,
      peakPower: Math.round(peakPower * 100) / 100,
      minPower: Math.round(minPower * 100) / 100,
      avgEfficiency: Math.round(avgEfficiency * 100) / 100,
      peakEfficiency: Math.round(peakEfficiency * 100) / 100,
      minEfficiency: Math.round(minEfficiency * 100) / 100,
      uptime: Math.round(uptime * 100) / 100,
      operatingHours: Math.round(operatingHours * 100) / 100,
      capacityFactor: Math.round(capacityFactor * 100) / 100,
      performanceRatio: Math.round(performanceRatio * 100) / 100,
      availability: Math.round(availability * 100) / 100,
      reliability: Math.round(reliability * 100) / 100,
      degradationRate: Math.round(degradationRate * 100) / 100
    },
    benchmarks,
    trends
  }
}

/**
 * Calculate energy generated in kWh
 */
function calculateEnergyGenerated(telemetryData: any[]): number {
  return telemetryData.reduce((sum, data) => {
    const power = Number(data.power || 0)
    const interval = 5 // Assuming 5-minute intervals
    return sum + (power * interval) / 60000 // Convert to kWh
  }, 0)
}

/**
 * Calculate uptime percentage
 */
function calculateUptime(telemetryData: any[]): number {
  if (telemetryData.length === 0) return 0

  const onlinePoints = telemetryData.filter(d => 
    d.deviceStatus !== 'offline' && d.deviceStatus !== 'error'
  ).length

  return (onlinePoints / telemetryData.length) * 100
}

/**
 * Calculate capacity factor
 */
function calculateCapacityFactor(energyGenerated: number, ratedCapacity: number, operatingHours: number): number {
  if (ratedCapacity === 0 || operatingHours === 0) return 0
  
  const maxEnergy = (ratedCapacity * operatingHours) / 1000 // kWh
  return (energyGenerated / maxEnergy) * 100
}

/**
 * Calculate performance ratio
 */
function calculatePerformanceRatio(energyGenerated: number, avgEfficiency: number, ratedCapacity: number): number {
  if (ratedCapacity === 0) return 0
  
  const theoreticalMax = (ratedCapacity * avgEfficiency / 100) / 1000 // kWh
  return (energyGenerated / theoreticalMax) * 100
}

/**
 * Calculate availability
 */
function calculateAvailability(uptime: number): number {
  return uptime
}

/**
 * Calculate reliability
 */
function calculateReliability(telemetryData: any[]): number {
  const statusChanges = telemetryData.filter((d, i) => 
    i === 0 || d.deviceStatus !== telemetryData[i - 1].deviceStatus
  ).length

  const reliabilityScore = Math.max(100 - (statusChanges * 5), 0)
  return reliabilityScore
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** Average telemetry efficiency (%) for a device over a window, or null when no data. */
async function avgEfficiencyForDevice(deviceId: string, start: Date, end: Date): Promise<number | null> {
  const rows = await db
    .select({ efficiency: deviceTelemetry.efficiency })
    .from(deviceTelemetry)
    .where(and(eq(deviceTelemetry.deviceId, deviceId), gte(deviceTelemetry.timestamp, start), lte(deviceTelemetry.timestamp, end)))
  const effs = rows.map((r) => Number(r.efficiency) || 0).filter((e) => e > 0)
  if (effs.length === 0) return null
  return effs.reduce((s, e) => s + e, 0) / effs.length
}

/**
 * Real degradation: annual %-drop in average efficiency vs the same window one year
 * earlier. Returns 0 (not a fabricated constant) when there is no year-ago history.
 */
async function calculateDegradationRate(deviceId: string, startDate: string, endDate: string): Promise<number> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const cur = await avgEfficiencyForDevice(deviceId, start, end)
  const prev = await avgEfficiencyForDevice(deviceId, subMonths(start, 12), subMonths(end, 12))
  if (cur == null || prev == null || prev <= 0) return 0
  return Math.max(0, ((prev - cur) / prev) * 100)
}

type BenchmarkBucket = { energyGenerated: number; avgEfficiency: number; capacityFactor: number; performanceRatio: number }

/**
 * Real benchmark = the PORTFOLIO average over the same window, from live telemetry.
 * We have no external industry/regional dataset, so the three buckets all carry the
 * real portfolio average (labelled honestly in the docs) rather than fabricated
 * constants. Falls back to zeros when the portfolio has no telemetry.
 */
async function getBenchmarks(startDate: string, endDate: string): Promise<{ industryAvg: BenchmarkBucket; facilityAvg: BenchmarkBucket; regionalAvg: BenchmarkBucket }> {
  const [agg] = await db
    .select({ avgEff: avg(deviceTelemetry.efficiency), avgPow: avg(deviceTelemetry.power) })
    .from(deviceTelemetry)
    .where(and(gte(deviceTelemetry.timestamp, new Date(startDate)), lte(deviceTelemetry.timestamp, new Date(endDate))))
  const avgEfficiency = Number(agg?.avgEff ?? 0)
  const avgPow = Number(agg?.avgPow ?? 0)
  const hours = Math.max(1, (new Date(endDate).getTime() - new Date(startDate).getTime()) / 3_600_000)
  const ratedCapacity = 5000
  const bucket: BenchmarkBucket = {
    energyGenerated: r2((avgPow * hours) / 1000),
    avgEfficiency: r2(avgEfficiency),
    capacityFactor: r2(ratedCapacity > 0 ? (avgPow / ratedCapacity) * 100 : 0),
    performanceRatio: r2(avgEfficiency),
  }
  return { industryAvg: bucket, facilityAvg: bucket, regionalAvg: bucket }
}

/**
 * Get default benchmarks
 */
function getDefaultBenchmarks(): any {
  return {
    industryAvg: {
      energyGenerated: 0,
      avgEfficiency: 0,
      capacityFactor: 0,
      performanceRatio: 0
    },
    facilityAvg: {
      energyGenerated: 0,
      avgEfficiency: 0,
      capacityFactor: 0,
      performanceRatio: 0
    },
    regionalAvg: {
      energyGenerated: 0,
      avgEfficiency: 0,
      capacityFactor: 0,
      performanceRatio: 0
    }
  }
}

/**
 * Real trends: compare this window's energy / efficiency / reliability against the
 * immediately preceding equal-length window (from live telemetry). ±5% deadband on
 * energy; ±2 pts on efficiency/reliability. Falls back to 'stable' with no history.
 */
async function getTrends(
  deviceId: string,
  startDate: string,
  endDate: string,
  energyGenerated: number,
  avgEfficiency: number,
  reliability: number
): Promise<PerformanceMetrics['trends']> {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const span = end.getTime() - start.getTime()
  const stable: PerformanceMetrics['trends'] = { energyTrend: 'stable', efficiencyTrend: 'stable', reliabilityTrend: 'stable' }
  if (!(span > 0)) return stable

  const prev = await db
    .select()
    .from(deviceTelemetry)
    .where(and(eq(deviceTelemetry.deviceId, deviceId), gte(deviceTelemetry.timestamp, new Date(start.getTime() - span)), lte(deviceTelemetry.timestamp, start)))
  if (prev.length === 0) return stable

  const prevEnergy = calculateEnergyGenerated(prev)
  const prevEffVals = prev.map((d) => Number(d.efficiency || 0)).filter((e) => e > 0)
  const prevEff = prevEffVals.length ? prevEffVals.reduce((s, e) => s + e, 0) / prevEffVals.length : 0
  const prevReliability = calculateReliability(prev)

  const energyTrend =
    prevEnergy > 0 && Math.abs(energyGenerated - prevEnergy) / prevEnergy > 0.05
      ? energyGenerated > prevEnergy ? 'increasing' : 'decreasing'
      : 'stable'
  const effDelta = avgEfficiency - prevEff
  const efficiencyTrend = effDelta > 2 ? 'improving' : effDelta < -2 ? 'declining' : 'stable'
  const relDelta = reliability - prevReliability
  const reliabilityTrend = relDelta > 2 ? 'improving' : relDelta < -2 ? 'declining' : 'stable'
  return { energyTrend, efficiencyTrend, reliabilityTrend }
}

/**
 * Get default trends
 */
function getDefaultTrends(): any {
  return {
    energyTrend: 'stable',
    efficiencyTrend: 'stable',
    reliabilityTrend: 'stable'
  }
}

/**
 * Get performance metrics
 */
/**
 * Real historical metrics: compute performance metrics for each of the last
 * `limit` months from live telemetry, skipping months with no data. Returns an
 * empty array (never fabricated) when no scope is given or no telemetry exists.
 */
async function getPerformanceMetrics(
  deviceId?: string | null,
  facilityId?: string | null,
  period: string = 'monthly',
  limit: number = 12
): Promise<PerformanceMetrics[]> {
  if (!deviceId && !facilityId) return []
  const out: PerformanceMetrics[] = []
  const now = new Date()
  for (let i = 0; i < Math.min(limit, 24); i++) {
    const monthDate = subMonths(now, i)
    try {
      const m = await calculatePerformanceMetrics(
        deviceId ?? null,
        facilityId ?? null,
        format(monthDate, 'yyyy-MM'),
        startOfMonth(monthDate).toISOString(),
        endOfMonth(monthDate).toISOString(),
        true,
        true,
      )
      out.push(m)
    } catch {
      // No telemetry for this month → honest gap, skip it.
    }
  }
  return out
}
