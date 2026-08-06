/**
 * Shared model for the admin Notifications Center. Many real data sources
 * (climate/NASA, resilience, energy, support, financing, system) are normalised
 * into one `AdminNotification` shape, then filtered, sorted and rendered by the
 * notifications page. Pure types + small lookups — no React, no fetch.
 */

export type NotifSeverity = "critical" | "high" | "medium" | "info"
export type NotifCategory = "climate" | "resilience" | "energy" | "support" | "financing" | "system"

export type AdminNotification = {
  id: string
  severity: NotifSeverity
  category: NotifCategory
  title: string
  message: string
  facility?: string | null
  /** Real facility id, used to deep-link the notification to that facility's detail. */
  facilityId?: string | null
  region?: string | null
  /** ISO timestamp when available (some derived items are point-in-time). */
  timestamp?: string | null
  /** Where to act on it, e.g. "Climate Outlook", "Support". */
  hint?: string
}

/** Admin dashboard section a category drills into (subset of SectionId). */
const CATEGORY_SECTION: Partial<Record<NotifCategory, { section: string; focusFacility: boolean }>> = {
  climate: { section: "climate-outlook", focusFacility: true },
  resilience: { section: "resilience-score", focusFacility: true },
  energy: { section: "afya-solar-portfolio-assessments", focusFacility: true },
  financing: { section: "afya-solar-portfolio-billing", focusFacility: false },
  // support + system have no admin facility-detail page → not navigable.
}

/**
 * Where a notification should open for detailed review, or null when no admin
 * page exists for it. `focusFacility` means the target page can auto-open that
 * facility's drill-down (climate/resilience/energy).
 */
export function notificationTarget(n: AdminNotification): { section: string; focusFacility: boolean } | null {
  return CATEGORY_SECTION[n.category] ?? null
}

/** Higher = more urgent (used for sorting and summary counts). */
export const SEVERITY_RANK: Record<NotifSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  info: 0,
}

export const SEVERITY_META: Record<NotifSeverity, { label: string; badge: string; dot: string }> = {
  critical: { label: "Critical", badge: "border-destructive/40 bg-destructive/10 text-destructive", dot: "bg-destructive" },
  high: { label: "High", badge: "border-warning/40 bg-warning/15 text-warning-foreground", dot: "bg-warning" },
  medium: { label: "Medium", badge: "border-primary/40 bg-primary/10 text-primary", dot: "bg-primary" },
  info: { label: "Info", badge: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
}

export const CATEGORY_META: Record<NotifCategory, { label: string }> = {
  climate: { label: "Climate" },
  resilience: { label: "Resilience" },
  energy: { label: "Energy" },
  support: { label: "Support" },
  financing: { label: "Financing" },
  system: { label: "System" },
}

/** Sort by severity (most urgent first), then most recent. */
export function sortNotifications(list: AdminNotification[]): AdminNotification[] {
  return [...list].sort((a, b) => {
    const sev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    if (sev !== 0) return sev
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0
    return tb - ta
  })
}

/** Compact "2h ago" / "3d ago" relative time; empty for missing timestamps. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return ""
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ""
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  const mo = Math.floor(day / 30)
  return `${mo}mo ago`
}
