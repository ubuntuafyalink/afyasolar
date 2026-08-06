/**
 * Derive admin notifications from REAL portfolio + operational data. Pure
 * functions — each source maps its natural shape into `AdminNotification[]`, so
 * the Notifications Center can aggregate them and a single failing source never
 * affects the others.
 */
import { formatCurrency } from "@/lib/utils"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"
import type { AdminFinancingContract } from "@/hooks/use-admin-payg-financing"
import type { SupportTicketLite, SystemLogLite } from "@/hooks/use-admin-notification-sources"
import type { AdminNotification, NotifSeverity } from "./notification-model"

const HAZARD_LABEL: Record<string, string> = {
  heat: "heat",
  flood: "flood",
  drought: "drought",
  storm: "storm",
}
const HAZARD_RISK: Record<string, string> = {
  heat: "cold-chain at risk",
  flood: "flooding / access risk",
  drought: "water-supply risk",
  storm: "wind / structural risk",
}

function num(v: number | string | null | undefined): number {
  const n = typeof v === "string" ? Number(v) : (v ?? 0)
  return Number.isFinite(n) ? n : 0
}

// --- climate + resilience (from real NASA exposure + CRiPHC) -----------------

export function climateResilienceNotifications(facilities: PortfolioFacility[]): AdminNotification[] {
  const out: AdminNotification[] = []
  let notClimateAssessed = 0

  for (const f of facilities) {
    // Resilience tier / critical attention.
    if (f.tier === "Critical") {
      out.push({
        id: `res-critical-${f.id}`,
        facilityId: f.id,
        severity: "critical",
        category: "resilience",
        title: "Critical resilience tier",
        message: `Resilience score ${f.climateRcs != null ? Math.round(f.climateRcs) : "—"}/100 — immediate attention recommended.`,
        facility: f.name,
        region: f.region,
        timestamp: f.climateAssessmentDate,
        hint: "Resilience Score",
      })
    } else if (f.climateCriticalAttention) {
      out.push({
        id: `res-attention-${f.id}`,
        facilityId: f.id,
        severity: "high",
        category: "resilience",
        title: "Flagged for critical attention",
        message: "A critical service is fragile relative to its climate exposure.",
        facility: f.name,
        region: f.region,
        timestamp: f.climateAssessmentDate,
        hint: "Resilience Score",
      })
    } else if (f.tier === "At risk") {
      out.push({
        id: `res-atrisk-${f.id}`,
        facilityId: f.id,
        severity: "medium",
        category: "resilience",
        title: "At-risk resilience tier",
        message: `Resilience score ${f.climateRcs != null ? Math.round(f.climateRcs) : "—"}/100.`,
        facility: f.name,
        region: f.region,
        timestamp: f.climateAssessmentDate,
        hint: "Resilience Score",
      })
    }

    if (!f.hasClimateSnapshot) notClimateAssessed += 1

    // NASA hazard exposure.
    const climate = f.climate
    if (climate && !climate.degraded) {
      const top = climate.topHazard
      if (top && top.score >= 66) {
        out.push({
          id: `clim-top-${f.id}`,
          facilityId: f.id,
          severity: top.score >= 80 ? "critical" : "high",
          category: "climate",
          title: `High ${HAZARD_LABEL[top.type] ?? top.type} exposure`,
          message: `${HAZARD_LABEL[top.type] ?? top.type} index ${Math.round(top.score)}/100 — ${HAZARD_RISK[top.type] ?? "elevated hazard"}.`,
          facility: f.name,
          region: f.region,
          hint: "Climate Outlook",
        })
      }
      // Any other hazard at the critical band (besides the top one already shown).
      for (const [key, val] of Object.entries(climate.byHazard)) {
        if (key === top?.type) continue
        if (val >= 80) {
          out.push({
            id: `clim-${key}-${f.id}`,
            facilityId: f.id,
            severity: "critical",
            category: "climate",
            title: `Severe ${HAZARD_LABEL[key] ?? key} exposure`,
            message: `${HAZARD_LABEL[key] ?? key} index ${Math.round(val)}/100 — ${HAZARD_RISK[key] ?? "elevated hazard"}.`,
            facility: f.name,
            region: f.region,
            hint: "Climate Outlook",
          })
        }
      }
    }
  }

  if (notClimateAssessed > 0) {
    out.push({
      id: "res-unassessed-climate",
      severity: "info",
      category: "resilience",
      title: `${notClimateAssessed} ${notClimateAssessed === 1 ? "facility" : "facilities"} not climate-assessed`,
      message: "Run a climate assessment to obtain a resilience score and hazard profile.",
      hint: "Resilience Score",
    })
  }

  return out
}

// --- energy ------------------------------------------------------------------

export function energyNotifications(facilities: PortfolioFacility[]): AdminNotification[] {
  const out: AdminNotification[] = []
  let notEnergyAssessed = 0

  for (const f of facilities) {
    if (f.energyBmiPercent != null && f.energyBmiPercent < 50) {
      out.push({
        id: `energy-low-${f.id}`,
        facilityId: f.id,
        severity: "medium",
        category: "energy",
        title: `Low energy efficiency (${Math.round(f.energyBmiPercent)}%)`,
        message: "Efficiency score is below 50% — review loads, backup and operations.",
        facility: f.name,
        region: f.region,
        timestamp: f.energyAssessmentDate,
        hint: "Energy Efficiency",
      })
    }
    if (!f.hasEnergySnapshot) notEnergyAssessed += 1
  }

  if (notEnergyAssessed > 0) {
    out.push({
      id: "energy-unassessed",
      severity: "info",
      category: "energy",
      title: `${notEnergyAssessed} ${notEnergyAssessed === 1 ? "facility" : "facilities"} without an energy assessment`,
      message: "Complete an energy assessment to unlock sizing, savings and efficiency tracking.",
      hint: "Energy Efficiency",
    })
  }

  return out
}

// --- support tickets ---------------------------------------------------------

export function supportNotifications(tickets: SupportTicketLite[]): AdminNotification[] {
  const out: AdminNotification[] = []
  for (const t of tickets) {
    if (t.status !== "open" && t.status !== "in_progress") continue
    const severity: NotifSeverity =
      t.priority === "urgent" ? "critical" : t.priority === "high" ? "high" : "medium"
    out.push({
      id: `support-${t.id}`,
      facilityId: t.facilityId,
      severity,
      category: "support",
      title: t.subject,
      message: `${t.ticketNumber} · ${t.category} · ${t.status === "open" ? "Open" : "In progress"} (${t.priority})`,
      facility: t.facilityName,
      timestamp: t.createdAt,
      hint: "Support",
    })
  }
  return out
}

// --- financing / billing -----------------------------------------------------

export function financingNotifications(contracts: AdminFinancingContract[]): AdminNotification[] {
  const out: AdminNotification[] = []
  for (const c of contracts) {
    const status = (c.status || "").toLowerCase()
    const overdue = num(c.daysOverdue)
    const outstanding = num(c.outstandingBalance)

    if (status === "defaulted" || status === "terminated") {
      out.push({
        id: `fin-default-${c.id}`,
        facilityId: c.customerId,
        severity: "critical",
        category: "financing",
        title: "Contract in default",
        message: `${formatCurrency(outstanding)} outstanding — contract ${status}.`,
        facility: c.facilityName,
        hint: "Bills & Payment",
      })
    } else if (overdue > 0) {
      out.push({
        id: `fin-overdue-${c.id}`,
        facilityId: c.customerId,
        severity: overdue > 30 ? "critical" : "high",
        category: "financing",
        title: `Payment overdue ${overdue} ${overdue === 1 ? "day" : "days"}`,
        message: `${formatCurrency(outstanding)} outstanding.`,
        facility: c.facilityName,
        hint: "Bills & Payment",
      })
    }
  }
  return out
}

// --- system logs -------------------------------------------------------------

export function systemNotifications(logs: SystemLogLite[]): AdminNotification[] {
  const out: AdminNotification[] = []
  for (const l of logs) {
    if (l.level !== "error" && l.level !== "warning") continue
    out.push({
      id: `sys-${l.id}`,
      severity: l.level === "error" ? "high" : "medium",
      category: "system",
      title: l.level === "error" ? `System error · ${l.category}` : `System warning · ${l.category}`,
      message: l.message,
      timestamp: l.timestamp,
      hint: "System logs",
    })
  }
  return out
}
