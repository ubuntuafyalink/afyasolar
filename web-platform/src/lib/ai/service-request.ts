/**
 * Shared request shape for server-to-server calls to the AI service.
 *
 * The AI service can be put behind a shared secret (AI_SERVICE_TOKEN). Every
 * server-side caller must therefore send the same headers, which is what this
 * exists to guarantee — six call sites each assembling their own headers is
 * how one of them ends up unauthenticated after the secret is turned on.
 */
import { env } from "@/lib/env"

/** Base URL of the AI service, without a trailing slash. */
export function aiServiceBase(): string {
  return (env.AI_SERVICE_URL ?? "http://localhost:8000").replace(/\/$/, "")
}

/** JSON headers, plus bearer auth when the service is configured to require it. */
export function aiServiceHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  const token = env.AI_SERVICE_TOKEN
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}
