/**
 * Bilingual (en/sw) static copy + deterministic severity band for the AI
 * prediction explainer. The band is computed client-side so the popover shows a
 * severity chip instantly, before the AI narrative loads (it mirrors the AI
 * service's _explain_meaning in llm.py).
 */
import type { ExplainMetric } from "@/lib/ai/explain-service"

export type Locale = "en" | "sw"

export type BandKey =
  | "low" | "moderate" | "high" | "severe"
  | "critical" | "watch" | "healthy"
  | "normal" | "flagged" | "info"

export const BAND_LABELS: Record<BandKey, Record<Locale, string>> = {
  low: { en: "Low", sw: "Chini" },
  moderate: { en: "Moderate", sw: "Wastani" },
  high: { en: "High", sw: "Juu" },
  severe: { en: "Severe", sw: "Kali" },
  critical: { en: "Critical", sw: "Hatari" },
  watch: { en: "Watch", sw: "Angalia" },
  healthy: { en: "Healthy", sw: "Nzuri" },
  normal: { en: "Normal", sw: "Kawaida" },
  flagged: { en: "Flagged", sw: "Onyo" },
  info: { en: "Estimate", sw: "Makadirio" },
}

/** Chip colour per band, using the design-system status tokens. */
export const BAND_COLOR: Record<BandKey, string> = {
  low: "var(--color-success)",
  normal: "var(--color-success)",
  healthy: "var(--color-success)",
  moderate: "var(--color-warning)",
  watch: "var(--color-warning)",
  high: "var(--color-warning)",
  severe: "var(--color-destructive)",
  critical: "var(--color-destructive)",
  flagged: "var(--color-destructive)",
  info: "var(--color-muted-foreground)",
}

export function computeBand(metric: ExplainMetric, value?: number): BandKey {
  if (value == null || Number.isNaN(value)) return "info"
  if (metric === "composite_hazard" || metric === "climate_hazard") {
    if (value < 25) return "low"
    if (value < 50) return "moderate"
    if (value < 75) return "high"
    return "severe"
  }
  if (metric === "battery_rul") return value < 90 ? "critical" : value < 180 ? "watch" : "healthy"
  if (metric === "anomaly") return value >= 1 ? "flagged" : "normal"
  return "info"
}

/** UI chrome strings for the explainer, en/sw. */
export const EXPLAINER_UI: Record<string, Record<Locale, string>> = {
  meaning: { en: "What this means", sw: "Maana yake" },
  drivers: { en: "Main drivers", sw: "Vichocheo vikuu" },
  loading: { en: "Explaining…", sw: "Inaeleza…" },
  error: { en: "Explanation unavailable. Ensure the AI service is running.", sw: "Maelezo hayapatikani. Hakikisha huduma ya AI inafanya kazi." },
  explain: { en: "Explain", sw: "Eleza" },
  aiBadge: { en: "AI", sw: "AI" },
  ruleBadge: { en: "rule-based", sw: "kanuni" },
}
