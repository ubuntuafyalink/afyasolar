import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { db } from "@/lib/db"
import { maintenanceRequests, facilities, technicians } from "@/lib/db/schema"
import { and, desc, eq } from "drizzle-orm"

export const dynamic = "force-dynamic"
export const revalidate = 0

export type AdminMaintenanceRequest = {
  id: string
  requestNumber: string
  facilityId: string
  facilityName: string
  deviceName: string
  issueDescription: string
  maintenanceType: string
  urgencyLevel: string
  status: string
  totalCost: number | null
  technicianName: string | null
  createdAt: string
  completedAt: string | null
  updatedAt: string
}

/**
 * GET /api/admin/maintenance/requests
 * Real maintenance request queue for the admin console. Filters: status, facilityId,
 * maintenanceType, urgencyLevel. Newest first. Returns [] when there are none.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const facilityId = searchParams.get("facilityId")
    const maintenanceType = searchParams.get("maintenanceType")
    const urgencyLevel = searchParams.get("urgencyLevel")

    const conditions = []
    if (status && status !== "all") conditions.push(eq(maintenanceRequests.status, status as any))
    if (facilityId && facilityId !== "all") conditions.push(eq(maintenanceRequests.facilityId, facilityId))
    if (maintenanceType && maintenanceType !== "all")
      conditions.push(eq(maintenanceRequests.maintenanceType, maintenanceType as any))
    if (urgencyLevel && urgencyLevel !== "all")
      conditions.push(eq(maintenanceRequests.urgencyLevel, urgencyLevel as any))
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const rows = await db
      .select({
        req: maintenanceRequests,
        facilityName: facilities.name,
        techFirst: technicians.firstName,
        techLast: technicians.lastName,
      })
      .from(maintenanceRequests)
      .leftJoin(facilities, eq(maintenanceRequests.facilityId, facilities.id))
      .leftJoin(technicians, eq(maintenanceRequests.assignedTechnicianId, technicians.id))
      .where(whereClause)
      .orderBy(desc(maintenanceRequests.createdAt))
      .limit(200)

    const data: AdminMaintenanceRequest[] = rows.map((r) => {
      const techName = r.techFirst ? `${r.techFirst} ${r.techLast ?? ""}`.trim() : null
      return {
        id: r.req.id,
        requestNumber: r.req.requestNumber,
        facilityId: r.req.facilityId,
        facilityName: r.facilityName || "Unknown Facility",
        deviceName: r.req.deviceName,
        issueDescription: r.req.issueDescription,
        maintenanceType: r.req.maintenanceType,
        urgencyLevel: r.req.urgencyLevel,
        status: r.req.status,
        totalCost: r.req.totalCost != null ? Number(r.req.totalCost) : null,
        technicianName: techName,
        createdAt: r.req.createdAt ? new Date(r.req.createdAt).toISOString() : new Date().toISOString(),
        completedAt: r.req.completedAt ? new Date(r.req.completedAt).toISOString() : null,
        updatedAt: r.req.updatedAt ? new Date(r.req.updatedAt).toISOString() : new Date().toISOString(),
      }
    })

    return NextResponse.json({ success: true, data, count: data.length })
  } catch (error) {
    console.error("[admin/maintenance/requests GET]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
