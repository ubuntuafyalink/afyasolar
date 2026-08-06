import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/config"
import { applyCarbonTransition } from "@/lib/carbon/apply-carbon-transition"

export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * POST /api/admin/carbon-credits/[id]/reject
 * Move a carbon credit pending|verified -> rejected. Stamps verifiedBy/verifiedAt server-side.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const note = typeof body?.note === "string" ? body.note : undefined
    const actor = session.user.email ?? session.user.id ?? "admin"

    const result = await applyCarbonTransition(id, "reject", actor, note)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

    return NextResponse.json({ success: true, data: result.data, message: "Carbon credit rejected" })
  } catch (error) {
    console.error("[carbon-credits reject POST]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
