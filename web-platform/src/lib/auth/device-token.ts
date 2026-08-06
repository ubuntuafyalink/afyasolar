/**
 * Device-token authentication for the telemetry ingestion endpoint (spec §8.1).
 *
 * Inverter adapters and local gateways are not browser sessions; they present a
 * shared bearer token (DEVICE_INGEST_TOKEN) in the Authorization header. Pure,
 * dependency-free, and unit-tested so the auth guard is verifiable without a
 * running server.
 */

/** Extract the token from an `Authorization: Bearer <token>` header. */
export function extractBearerToken(header: string | null | undefined): string | null {
  if (!header) return null
  const match = header.match(/^Bearer\s+(.+)$/i)
  return match ? match[1].trim() : null
}

/** Length-independent constant-time-ish string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

/**
 * True when the request's Authorization header carries the expected device
 * ingest token. Returns false if either the header or the expected token is
 * missing/empty (fail closed) — a device token is never optional.
 */
export function isValidDeviceToken(
  header: string | null | undefined,
  expected: string | undefined | null,
): boolean {
  const token = extractBearerToken(header)
  if (!token || !expected) return false
  return safeEqual(token, expected)
}
