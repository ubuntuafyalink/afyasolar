/**
 * Client-side helper + types for the climate outlook report. The browser calls
 * the internal /api/ai/outlook-report proxy, which forwards to FastAPI
 * /predict/outlook-report. The report is derived from already-computed hazard
 * scores (the same numbers the forecast cards display), so report and charts
 * always agree. Client-safe: no env / server-only imports.
 */

export type OutlookHazardsInput = {
  heat: number
  flood: number
  storm: number
  drought: number
  composite: number
}

export type OutlookReportItem = {
  hazard: "heat" | "flood" | "storm" | "drought"
  name: string
  score: number
  band: "low" | "moderate" | "high" | "severe"
  band_label: string
  actions?: string[]
}

export type AiOutlookReport = {
  status: "action_needed" | "all_clear"
  triggered: OutlookReportItem[]
  watch: OutlookReportItem[]
  summary: string
  source: "llm" | "fallback"
  model?: string
  lang: "en" | "sw"
  scope: "facility" | "portfolio"
  generated_at: string
}

export type FetchOutlookReportArgs = {
  hazards: OutlookHazardsInput
  lang?: "en" | "sw"
  scope?: "facility" | "portfolio"
  context?: Record<string, unknown>
}

export async function fetchOutlookReport(args: FetchOutlookReportArgs): Promise<AiOutlookReport> {
  const res = await fetch("/api/ai/outlook-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(json?.error?.message || `Outlook report failed (${res.status})`)
  }
  return json as AiOutlookReport
}
