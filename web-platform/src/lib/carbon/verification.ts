/**
 * Pure carbon-credit verification workflow logic (no DB/IO) so it is unit-testable.
 * Status lifecycle: pending -> verified -> certified, with reject reachable from
 * pending or verified.
 */

export type CarbonStatus = "pending" | "verified" | "certified" | "rejected"
export type CarbonAction = "verify" | "certify" | "reject"

/** The status each action moves a credit INTO. */
export const CARBON_ACTION_TARGET: Record<CarbonAction, CarbonStatus> = {
  verify: "verified",
  certify: "certified",
  reject: "rejected",
}

/** The source statuses each action is allowed FROM. */
export const CARBON_ACTION_ALLOWED_FROM: Record<CarbonAction, CarbonStatus[]> = {
  verify: ["pending"],
  certify: ["verified"],
  reject: ["pending", "verified"],
}

export function canTransition(current: string | null | undefined, action: CarbonAction): boolean {
  if (!current) return false
  return CARBON_ACTION_ALLOWED_FROM[action].includes(current as CarbonStatus)
}

/**
 * Build a human-readable, unique certificate id from a year + a raw uuid.
 * Format: CC-<YYYY>-<8 uppercase hex>. The raw id is supplied by the caller
 * (generateId()) so this stays pure and testable.
 */
export function formatCertificateId(year: number, rawId: string): string {
  const suffix = rawId.replace(/-/g, "").slice(0, 8).toUpperCase()
  return `CC-${year}-${suffix}`
}
