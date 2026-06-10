/**
 * Server-side application of a carbon-credit verification transition. Shared by the
 * dedicated admin sub-routes (verify / certify / reject). Stamps the acting admin and
 * timestamp SERVER-side and generates the certificate id on certify (never trusts the
 * client for identity or certificate id).
 */
import { db } from "@/lib/db"
import { carbonCredits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { generateId } from "@/lib/utils"
import {
  CARBON_ACTION_TARGET,
  canTransition,
  formatCertificateId,
  type CarbonAction,
} from "@/lib/carbon/verification"

export type CarbonTransitionRow = {
  id: string
  verificationStatus: string
  certificateId?: string
  verifiedAt?: string
  verifiedBy?: string
  notes?: string
  updatedAt: string
}

export type CarbonTransitionResult =
  | { ok: true; data: CarbonTransitionRow }
  | { ok: false; status: number; error: string }

export async function applyCarbonTransition(
  id: string,
  action: CarbonAction,
  actor: string,
  note?: string,
): Promise<CarbonTransitionResult> {
  const [row] = await db.select().from(carbonCredits).where(eq(carbonCredits.id, id)).limit(1)
  if (!row) return { ok: false, status: 404, error: "Carbon credit not found" }

  if (!canTransition(row.verificationStatus, action)) {
    return {
      ok: false,
      status: 409,
      error: `Cannot ${action} a carbon credit with status "${row.verificationStatus}"`,
    }
  }

  const now = new Date()
  const target = CARBON_ACTION_TARGET[action]
  const certificateId =
    action === "certify" ? formatCertificateId(now.getFullYear(), generateId()) : row.certificateId ?? null

  await db
    .update(carbonCredits)
    .set({
      verificationStatus: target,
      verifiedBy: actor,
      verifiedAt: now,
      notes: note ?? row.notes ?? null,
      certificateId,
      updatedAt: now,
    })
    .where(eq(carbonCredits.id, id))

  const [updated] = await db.select().from(carbonCredits).where(eq(carbonCredits.id, id)).limit(1)

  return {
    ok: true,
    data: {
      id: updated.id,
      verificationStatus: updated.verificationStatus,
      certificateId: updated.certificateId ?? undefined,
      verifiedAt: updated.verifiedAt ? new Date(updated.verifiedAt).toISOString() : undefined,
      verifiedBy: updated.verifiedBy ?? undefined,
      notes: updated.notes ?? undefined,
      updatedAt: new Date(updated.updatedAt).toISOString(),
    },
  }
}
