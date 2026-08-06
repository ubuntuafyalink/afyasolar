import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { afyaSolarMeterReadings } from "@/lib/db/afya-solar-schema"
import { desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type MeterReading = {
  id: number
  smartmeterId: number
  recordedAt: string | null
  voltage: number | null
  current: number | null
  power: number | null
  energy: number | null
  relayStatus: string | null
  creditBalance: number | null
  status: string | null
}

function mapRow(r: typeof afyaSolarMeterReadings.$inferSelect): MeterReading {
  return {
    id: r.id,
    smartmeterId: r.smartmeterId,
    recordedAt: r.recordedAt ? new Date(r.recordedAt).toISOString() : null,
    voltage: r.voltage != null ? Number(r.voltage) : null,
    current: r.current != null ? Number(r.current) : null,
    power: r.power != null ? Number(r.power) : null,
    energy: r.energy != null ? Number(r.energy) : null,
    relayStatus: r.relayStatus ?? null,
    creditBalance: r.creditBalance != null ? Number(r.creditBalance) : null,
    status: r.status ?? null,
  }
}

/**
 * GET /api/afya-solar/meter-readings
 * Real smartmeter readings. Without ?smartmeterId returns the LATEST reading per
 * meter (for the meters list); with ?smartmeterId returns that meter's recent
 * readings. Returns [] when none exist (honest empty state).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const smartmeterIdParam = searchParams.get("smartmeterId")

    if (smartmeterIdParam) {
      const smartmeterId = Number(smartmeterIdParam)
      if (!Number.isFinite(smartmeterId)) {
        return NextResponse.json({ error: "Invalid smartmeterId" }, { status: 400 })
      }
      const rows = await db
        .select()
        .from(afyaSolarMeterReadings)
        .where(eq(afyaSolarMeterReadings.smartmeterId, smartmeterId))
        .orderBy(desc(afyaSolarMeterReadings.recordedAt))
        .limit(50)
      return NextResponse.json({ success: true, data: rows.map(mapRow), count: rows.length })
    }

    // Latest reading per meter: scan recent readings (desc) and keep the first per meter.
    const rows = await db
      .select()
      .from(afyaSolarMeterReadings)
      .orderBy(desc(afyaSolarMeterReadings.recordedAt))
      .limit(2000)

    const latest = new Map<number, typeof afyaSolarMeterReadings.$inferSelect>()
    for (const r of rows) {
      if (!latest.has(r.smartmeterId)) latest.set(r.smartmeterId, r)
    }
    const data = Array.from(latest.values()).map(mapRow)

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (error) {
    // Readings ingestion may not be provisioned yet (table absent). Treat as an
    // honest empty state instead of a 500 so the meters UI shows "No readings yet".
    if ((error as { code?: string })?.code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ success: true, data: [], count: 0 })
    }
    console.error("[afya-solar/meter-readings GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
