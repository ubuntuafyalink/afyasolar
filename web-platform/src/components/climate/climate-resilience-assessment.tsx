"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { AlertTriangle, CheckCircle2, FileUp, Database } from "lucide-react"

type ModuleCode = "HES" | "CSF" | "ECPQ" | "EDC" | "RRC"

type AnswerChoice = {
  id: string
  label: string
  score: number
}

type Question = {
  module: ModuleCode
  code: string
  title: string
  helper: string
  max: number
  choices: AnswerChoice[]
  evidenceSuggested?: boolean
  redFlagIfAnswerId?: string
}

type EvidenceItem = {
  questionCode: string
  type: "photo" | "document" | "url" | "note"
  fileUrl?: string
  note?: string
  capturedAt: string
}

const MODULE_MAX: Record<ModuleCode, number> = {
  HES: 20,
  CSF: 30,
  ECPQ: 25,
  EDC: 15,
  RRC: 10,
}

// Guided climate flow (v2.0): 36 questions per screen, progressive disclosure, assistive helper text.
const QUESTIONS: Question[] = [
  {
    module: "HES",
    code: "HES_FLOOD",
    title: "Flood exposure around the facility",
    helper: "Why this matters: flood events can damage inverters, batteries, and critical service areas.",
    max: 5,
    evidenceSuggested: true,
    choices: [
      { id: "none", label: "No known flood exposure", score: 0 },
      { id: "low", label: "Low / rare flooding nearby", score: 1 },
      { id: "med", label: "Medium / occasional flooding", score: 3 },
      { id: "high", label: "High / frequent flooding impacts", score: 5 },
    ],
  },
  {
    module: "HES",
    code: "HES_HEAT",
    title: "Heat stress risk (high temperatures)",
    helper: "Why this matters: heat reduces battery life and increases cold-chain and medicine spoilage risk.",
    max: 5,
    evidenceSuggested: false,
    choices: [
      { id: "none", label: "Low heat risk", score: 0 },
      { id: "low", label: "Some hot periods", score: 1 },
      { id: "med", label: "Frequent heat stress", score: 3 },
      { id: "high", label: "Severe heat stress", score: 5 },
    ],
  },
  {
    module: "HES",
    code: "HES_STORM",
    title: "Storm / wind / lightning exposure",
    helper: "Why this matters: storms can damage PV and disrupt grid reliability.",
    max: 5,
    evidenceSuggested: false,
    choices: [
      { id: "none", label: "Low", score: 0 },
      { id: "low", label: "Occasional", score: 1 },
      { id: "med", label: "Regular", score: 3 },
      { id: "high", label: "Severe", score: 5 },
    ],
  },
  {
    module: "HES",
    code: "HES_GRID",
    title: "Grid instability exposure",
    helper: "Why this matters: unstable grid increases outage exposure and equipment stress.",
    max: 5,
    evidenceSuggested: false,
    choices: [
      { id: "stable", label: "Stable", score: 0 },
      { id: "minor", label: "Minor issues", score: 1 },
      { id: "med", label: "Frequent outages", score: 3 },
      { id: "severe", label: "Severe instability", score: 5 },
    ],
  },
  {
    module: "CSF",
    code: "CSF_COLD_CHAIN",
    title: "Cold-chain fragility (vaccines/medicines)",
    helper: "Why this matters: cold-chain failures are high-severity clinical risks.",
    max: 10,
    evidenceSuggested: true,
    redFlagIfAnswerId: "severe",
    choices: [
      { id: "none", label: "No cold-chain services", score: 0 },
      { id: "managed", label: "Cold chain present & well managed", score: 3 },
      { id: "weak", label: "Cold chain present with gaps", score: 7 },
      { id: "severe", label: "Frequent cold-chain failures", score: 10 },
    ],
  },
  {
    module: "CSF",
    code: "CSF_MATERNITY",
    title: "Critical service fragility (maternity / theatre / lab)",
    helper: "Why this matters: outages during critical services increase harm risk.",
    max: 10,
    evidenceSuggested: false,
    choices: [
      { id: "low", label: "Low fragility", score: 2 },
      { id: "med", label: "Medium fragility", score: 6 },
      { id: "high", label: "High fragility", score: 10 },
    ],
  },
  {
    module: "CSF",
    code: "CSF_WATER",
    title: "Water / pump dependency fragility",
    helper: "Why this matters: power loss can stop water and sanitation services.",
    max: 10,
    evidenceSuggested: false,
    choices: [
      { id: "low", label: "Low dependency", score: 2 },
      { id: "med", label: "Medium dependency", score: 6 },
      { id: "high", label: "High dependency", score: 10 },
    ],
  },
  {
    module: "ECPQ",
    code: "ECPQ_BACKUP",
    title: "Backup coverage for critical loads",
    helper: "Why this matters: continuity depends on critical circuits and autonomy.",
    max: 10,
    evidenceSuggested: true,
    redFlagIfAnswerId: "none",
    choices: [
      { id: "none", label: "No backup", score: 10 },
      { id: "partial", label: "Partial backup", score: 6 },
      { id: "mostly", label: "Mostly covered", score: 3 },
      { id: "full", label: "Fully covered", score: 0 },
    ],
  },
  {
    module: "ECPQ",
    code: "ECPQ_POWER_QUALITY",
    title: "Power quality issues (voltage spikes, outages)",
    helper: "Why this matters: poor power quality damages equipment and increases downtime.",
    max: 8,
    evidenceSuggested: false,
    choices: [
      { id: "none", label: "No issues", score: 0 },
      { id: "some", label: "Some issues", score: 4 },
      { id: "many", label: "Frequent issues", score: 8 },
    ],
  },
  {
    module: "ECPQ",
    code: "ECPQ_PROTECTION",
    title: "Electrical protection & grounding readiness",
    helper: "Why this matters: lightning and surge protection reduces failures.",
    max: 7,
    evidenceSuggested: false,
    choices: [
      { id: "good", label: "Adequate protection", score: 0 },
      { id: "partial", label: "Partial", score: 3 },
      { id: "poor", label: "Poor", score: 7 },
    ],
  },
  {
    module: "EDC",
    code: "EDC_DEMAND",
    title: "Demand control practices (switch-off, scheduling)",
    helper: "Why this matters: demand control reduces cost and improves backup feasibility.",
    max: 8,
    evidenceSuggested: false,
    choices: [
      { id: "strong", label: "Strong practices", score: 0 },
      { id: "some", label: "Some practices", score: 4 },
      { id: "none", label: "No practices", score: 8 },
    ],
  },
  {
    module: "EDC",
    code: "EDC_THERMAL",
    title: "Thermal efficiency (ventilation, shading, insulation)",
    helper: "Why this matters: cooling load reduction improves savings and resilience.",
    max: 7,
    evidenceSuggested: true,
    choices: [
      { id: "good", label: "Good", score: 0 },
      { id: "some", label: "Some gaps", score: 3 },
      { id: "poor", label: "Poor", score: 7 },
    ],
  },
  {
    module: "RRC",
    code: "RRC_SOP",
    title: "Readiness SOPs & response training",
    helper: "Why this matters: documented SOPs reduce operational failure during shocks.",
    max: 5,
    evidenceSuggested: true,
    choices: [
      { id: "yes", label: "SOPs exist & trained", score: 0 },
      { id: "partial", label: "Partial SOPs", score: 2 },
      { id: "no", label: "No SOPs", score: 5 },
    ],
  },
  {
    module: "RRC",
    code: "RRC_EVIDENCE",
    title: "Evidence capture readiness",
    helper: "Why this matters: evidence supports funding, QA, and learning loops.",
    max: 5,
    evidenceSuggested: true,
    choices: [
      { id: "yes", label: "Evidence routinely captured", score: 0 },
      { id: "some", label: "Sometimes captured", score: 2 },
      { id: "no", label: "Not captured", score: 5 },
    ],
  },
]

type ResponseMap = Record<string, { answerId: string; note?: string }>

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getTier(score: number, criticalAttention: boolean) {
  if (criticalAttention) return { tier: 0, label: "Critical attention" }
  if (score >= 80) return { tier: 3, label: "Tier 3 (strong)" }
  if (score >= 60) return { tier: 2, label: "Tier 2 (moderate)" }
  if (score >= 40) return { tier: 1, label: "Tier 1 (weak)" }
  return { tier: 0, label: "Tier 0 (fragile)" }
}

function computeModuleScores(responses: ResponseMap) {
  const sums: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  const max: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  let criticalAttention = false

  for (const q of QUESTIONS) {
    max[q.module] += q.max
    const r = responses[q.code]
    if (!r?.answerId) continue
    const choice = q.choices.find((c) => c.id === r.answerId)
    if (!choice) continue
    sums[q.module] += clamp(choice.score, 0, q.max)
    if (q.redFlagIfAnswerId && r.answerId === q.redFlagIfAnswerId) {
      criticalAttention = true
    }
  }

  // Normalize each module to required maxima in the document.
  const normalized: Record<ModuleCode, number> = { HES: 0, CSF: 0, ECPQ: 0, EDC: 0, RRC: 0 }
  ;(Object.keys(MODULE_MAX) as ModuleCode[]).forEach((m) => {
    const rawMax = Math.max(1, max[m])
    normalized[m] = Math.round((sums[m] / rawMax) * MODULE_MAX[m] * 10) / 10
  })

  const total =
    normalized.HES + normalized.CSF + normalized.ECPQ + normalized.EDC + normalized.RRC

  return {
    raw: sums,
    normalized,
    total: Math.round(total * 10) / 10,
    criticalAttention,
  }
}

function rankTopRisks(scores: Record<ModuleCode, number>) {
  const drivers = [
    { key: "flood", module: "HES" as const, title: "Flood exposure", w: 1.0 },
    { key: "heat", module: "HES" as const, title: "Heat stress", w: 0.9 },
    { key: "cold", module: "CSF" as const, title: "Cold-chain fragility", w: 1.2 },
    { key: "backup", module: "ECPQ" as const, title: "Backup gaps", w: 1.1 },
    { key: "sop", module: "RRC" as const, title: "SOP & readiness", w: 1.0 },
  ]
  const list = drivers
    .map((d) => {
      const moduleScore = scores[d.module]
      return {
        ...d,
        severity: Math.round(clamp((moduleScore / MODULE_MAX[d.module]) * 100 * d.w, 0, 100)),
      }
    })
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)

  return list
}

function storageKey(facilityId: string) {
  return `afyasolar:climateAssessment:v2:${facilityId}`
}

export function ClimateResilienceAssessment({
  facilityId,
  assessmentCycleId,
  onCapacityScoreChange,
  readOnly = false,
}: {
  facilityId: string
  assessmentCycleId?: string
  onCapacityScoreChange?: (score: number | null) => void
  /** Historical / submitted cycle no edits or autosave */
  readOnly?: boolean
}) {
  const [step, setStep] = useState<number>(0)
  const [responses, setResponses] = useState<ResponseMap>({})
  const [evidence, setEvidence] = useState<EvidenceItem[]>([])
  const [remoteLoaded, setRemoteLoaded] = useState<boolean>(false)
  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccessAt, setSaveSuccessAt] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!assessmentCycleId) return

    ;(async () => {
      try {
        const res = await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, { cache: "no-store" })
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) return

        const nextResponses: ResponseMap = {}
        const serverResponses = Array.isArray(json?.responses) ? json.responses : []
        for (const r of serverResponses) {
          if (!r?.questionCode || !r?.answerValue) continue
          nextResponses[String(r.questionCode)] = {
            answerId: String(r.answerValue),
            note: typeof r.note === "string" ? r.note : undefined,
          }
        }

        const serverEvidence = Array.isArray(json?.evidence) ? json.evidence : []
        const nextEvidence: EvidenceItem[] = serverEvidence
          .filter((e: any) => e?.questionCode && e?.type)
          .map((e: any) => ({
            questionCode: String(e.questionCode),
            type: e.type as EvidenceItem["type"],
            fileUrl: typeof e.fileUrl === "string" ? e.fileUrl : undefined,
            note: typeof e.note === "string" ? e.note : undefined,
            capturedAt: e.capturedAt ? new Date(e.capturedAt).toISOString() : new Date().toISOString(),
          }))

        setResponses(nextResponses)
        setEvidence(nextEvidence)
        setRemoteLoaded(true)
      } catch {
        if (!cancelled) setRemoteLoaded(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [assessmentCycleId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(facilityId))
      if (!raw) return
      // If remote persisted data exists, prefer it over local draft.
      if (assessmentCycleId && remoteLoaded) return
      const parsed = JSON.parse(raw)
      if (parsed?.responses) setResponses(parsed.responses)
      if (Array.isArray(parsed?.evidence)) setEvidence(parsed.evidence)
      if (typeof parsed?.step === "number") setStep(parsed.step)
    } catch {
      // ignore
    }
  }, [facilityId])

  useEffect(() => {
    if (readOnly) return
    try {
      // Keep local drafts for offline continuity even when DB persistence is enabled.
      localStorage.setItem(
        storageKey(facilityId),
        JSON.stringify({ responses, evidence, step, updatedAt: new Date().toISOString() })
      )
    } catch {
      // ignore
    }
  }, [facilityId, responses, evidence, step, readOnly])

  const pages = useMemo(() => {
    const groups: { id: string; title: string; items: Question[] }[] = [
      { id: "hazards", title: "Hazard profile", items: QUESTIONS.filter((q) => q.module === "HES") },
      { id: "fragility", title: "Critical service fragility", items: QUESTIONS.filter((q) => q.module === "CSF") },
      { id: "continuity", title: "Energy continuity & power quality", items: QUESTIONS.filter((q) => q.module === "ECPQ") },
      { id: "demand", title: "Efficiency & demand control", items: QUESTIONS.filter((q) => q.module === "EDC") },
      { id: "readiness", title: "Readiness & response", items: QUESTIONS.filter((q) => q.module === "RRC") },
      { id: "results", title: "Results & adaptation plan", items: [] },
    ]
    return groups
  }, [])

  const currentPage = pages[step] ?? pages[0]

  const scores = useMemo(() => computeModuleScores(responses), [responses])
  const tier = useMemo(() => getTier(100 - scores.total, scores.criticalAttention), [scores])
  // Note: scores.total is risk-weighted; invert to present capacity score.
  const resilienceCapacityScore = useMemo(() => Math.round((100 - scores.total) * 10) / 10, [scores])

  const topRisks = useMemo(() => rankTopRisks(scores.normalized), [scores])

  const answeredCount = useMemo(() => {
    return QUESTIONS.filter((q) => responses[q.code]?.answerId).length
  }, [responses])

  const totalQuestions = QUESTIONS.length
  const progress = Math.round((answeredCount / totalQuestions) * 100)

  const buildResponseRows = () => {
    return QUESTIONS.map((q) => {
      const r = responses[q.code]
      const choice = q.choices.find((c) => c.id === r?.answerId)
      if (!r?.answerId || !choice) return null
      return {
        moduleCode: q.module,
        questionCode: q.code,
        answerValue: r.answerId,
        score: clamp(choice.score, 0, q.max),
        scoreMax: q.max,
        note: r.note ?? null,
        confidence: 100,
        isRedFlag: Boolean(q.redFlagIfAnswerId && r.answerId === q.redFlagIfAnswerId),
      }
    }).filter(Boolean) as any[]
  }

  const buildEvidenceRows = () => {
    return evidence.map((e) => ({
      questionCode: e.questionCode,
      type: e.type,
      fileUrl: e.fileUrl ?? null,
      note: e.note ?? null,
      capturedAt: e.capturedAt,
    }))
  }

  useEffect(() => {
    onCapacityScoreChange?.(answeredCount > 0 ? resilienceCapacityScore : null)
  }, [answeredCount, onCapacityScoreChange, resilienceCapacityScore])

  // Persist to DB (auto-save) when assessmentCycleId is available.
  useEffect(() => {
    let cancelled = false
    if (readOnly) return
    if (!assessmentCycleId) return
    if (!remoteLoaded) return

    const timeout = setTimeout(async () => {
      try {
        // Build normalized response rows from QUESTIONS (single source of truth for scoring).
        const responseRows = QUESTIONS.map((q) => {
          const r = responses[q.code]
          const choice = q.choices.find((c) => c.id === r?.answerId)
          if (!r?.answerId || !choice) return null
          return {
            moduleCode: q.module,
            questionCode: q.code,
            answerValue: r.answerId,
            score: clamp(choice.score, 0, q.max),
            scoreMax: q.max,
            note: r.note ?? null,
            confidence: 100,
            isRedFlag: Boolean(q.redFlagIfAnswerId && r.answerId === q.redFlagIfAnswerId),
          }
        }).filter(Boolean)

        const evidenceRows = evidence.map((e) => ({
          questionCode: e.questionCode,
          type: e.type,
          fileUrl: e.fileUrl ?? null,
          note: e.note ?? null,
          capturedAt: e.capturedAt,
        }))

        await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ responses: responseRows, evidence: evidenceRows }),
        })

        // Persist computed score + top risks for reporting/portfolio.
        if (!cancelled && responseRows.length > 0) {
          await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ responses: responseRows }),
          })
        }
      } catch {
        // ignore (offline / transient)
      }
    }, 900)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [assessmentCycleId, evidence, remoteLoaded, responses, readOnly])

  const saveClimateToDatabase = async () => {
    if (readOnly) return
    if (!assessmentCycleId) return
    if (!remoteLoaded) {
      setSaveError("Loading saved climate record first...")
      return
    }

    const responseRows = buildResponseRows()
    if (responseRows.length === 0) {
      setSaveError("Select answers before saving climate.")
      return
    }

    setSaveBusy(true)
    setSaveError(null)
    try {
      const evidenceRows = buildEvidenceRows()

      await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responseRows, evidence: evidenceRows }),
      })

      await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: responseRows }),
      })

      const snapRes = await fetch(`/api/assessment-cycles/${assessmentCycleId}/climate`, { cache: "no-store" })
      const snapJson = await snapRes.json().catch(() => ({} as any))
      if (!snapRes.ok) throw new Error((snapJson as any)?.error || "Failed to compute climate snapshot")

      const saveRes = await fetch(`/api/facility/${facilityId}/assessment-reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceVersion: "3.0",
          assessmentCycleId,
          climate: snapJson,
        }),
      })
      const saveJson = await saveRes.json().catch(() => ({} as any))
      if (!saveRes.ok || !saveJson?.success) {
        throw new Error((saveJson as any)?.error || "Failed to save climate to database")
      }

      setSaveSuccessAt(Date.now())
      window.setTimeout(() => setSaveSuccessAt(null), 2000)
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save climate")
    } finally {
      setSaveBusy(false)
    }
  }

  const addEvidence = (questionCode: string, item: Omit<EvidenceItem, "capturedAt" | "questionCode">) => {
    setEvidence((prev) => [
      { questionCode, capturedAt: new Date().toISOString(), ...item },
      ...prev,
    ])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">
            {readOnly
              ? "Viewing a saved assessment record (read-only)."
              : "Guided climate resilience assessment (CRiPHC-aligned scoring scaffold)."}
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saveBusy || !assessmentCycleId}
            onClick={() => void saveClimateToDatabase()}
          >
            <Database className="h-4 w-4 mr-1" aria-hidden />
            {saveBusy ? "Saving..." : "Save Climate to Database"}
          </Button>
        )}
      </div>
      {(saveError || saveSuccessAt) && (
        <div className="text-xs">
          {saveError && <span className="text-red-600">{saveError}</span>}
          {saveSuccessAt && <span className="text-emerald-700">Climate saved to database.</span>}
        </div>
      )}

      <fieldset
        disabled={readOnly}
        className="min-w-0 space-y-4 border-0 p-0 m-0 disabled:opacity-[0.88]"
      >
      <Card className="border-emerald-100">
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">
                Climate Resilience &amp; Adaptation
              </CardTitle>
              <CardDescription className="text-xs">
                Answer 36 questions per screen. Add notes and evidence when relevant.
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-emerald-200 text-emerald-800">
              Progress: {progress}%
            </Badge>
          </div>
          <Progress value={progress} className="h-2 mt-2 bg-emerald-100" />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stepper */}
          <div className="grid gap-2 sm:grid-cols-6">
            {pages.map((p, idx) => {
              const active = idx === step
              const complete = idx < step
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStep(idx)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left text-xs transition-colors",
                    active
                      ? "border-emerald-300 bg-white shadow-sm"
                      : complete
                        ? "border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/50"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-medium", active ? "text-emerald-950" : "text-slate-700")}>
                      {p.title}
                    </span>
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    ) : active ? (
                      <Badge className="bg-emerald-600 text-white text-[10px]">Now</Badge>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Content */}
          {currentPage.id !== "results" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
                <p className="text-sm font-semibold text-emerald-950">
                  {currentPage.title}
                </p>
                <p className="text-xs text-emerald-900/70 mt-1">
                  Keep answers practical. Add evidence only when it strengthens decisions or funding readiness.
                </p>
              </div>

              <div className="space-y-4">
                {currentPage.items.map((q) => {
                  const r = responses[q.code]
                  const choice = q.choices.find((c) => c.id === r?.answerId)
                  const hasRedFlag = Boolean(q.redFlagIfAnswerId && r?.answerId === q.redFlagIfAnswerId)
                  const evidenceCount = evidence.filter((e) => e.questionCode === q.code).length

                  return (
                    <Card key={q.code} className={cn("border-emerald-100", hasRedFlag && "border-amber-200")}>
                      <CardHeader className="pb-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <CardTitle className="text-sm">
                              {q.title}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {q.helper}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasRedFlag && (
                              <Badge className="bg-amber-100 text-amber-900 border border-amber-200">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Red flag
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              Max: {q.max}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Answer</Label>
                          <Select
                            value={r?.answerId ?? ""}
                            onValueChange={(v) =>
                              setResponses((prev) => ({
                                ...prev,
                                [q.code]: { ...prev[q.code], answerId: v },
                              }))
                            }
                          >
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {q.choices.map((c) => (
                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[11px] text-muted-foreground">
                            Score: {choice ? choice.score : ""} / {q.max}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Optional note</Label>
                          <Textarea
                            value={r?.note ?? ""}
                            onChange={(e) =>
                              setResponses((prev) => ({
                                ...prev,
                                [q.code]: { ...prev[q.code], note: e.target.value },
                              }))
                            }
                            placeholder="Add context, assumptions, or constraints"
                            className="text-xs"
                          />
                        </div>

                        {q.evidenceSuggested && (
                          <div className="rounded-lg border border-emerald-100 bg-emerald-50/30 p-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-medium text-emerald-950">
                                Evidence (optional)
                              </p>
                              <Badge variant="outline" className="text-[10px]">
                                {evidenceCount} items
                              </Badge>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Evidence URL</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="https://..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const v = (e.target as HTMLInputElement).value.trim()
                                      if (!v) return
                                      addEvidence(q.code, { type: "url", fileUrl: v })
                                      ;(e.target as HTMLInputElement).value = ""
                                    }
                                  }}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  Press Enter to add.
                                </p>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Evidence note</Label>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Short description"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const v = (e.target as HTMLInputElement).value.trim()
                                      if (!v) return
                                      addEvidence(q.code, { type: "note", note: v })
                                      ;(e.target as HTMLInputElement).value = ""
                                    }
                                  }}
                                />
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <FileUp className="h-3.5 w-3.5" />
                                  Upload support can be added later.
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))}>
                  Back
                </Button>
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep((s) => Math.min(pages.length - 1, s + 1))}>
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="border-emerald-100 lg:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resilience Capacity Score</CardTitle>
                    <CardDescription className="text-xs">0100 (higher = better)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-emerald-800">{resilienceCapacityScore}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">Tier: {tier.tier}</Badge>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
                        {tier.label}
                      </Badge>
                      {scores.criticalAttention && (
                        <Badge className="bg-amber-100 text-amber-900 border border-amber-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Critical attention
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100 lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Score breakdown</CardTitle>
                    <CardDescription className="text-xs">
                      HES / CSF / ECPQ / EDC / RRC contribute to total (risk-weighted).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-5 text-xs">
                    {(["HES", "CSF", "ECPQ", "EDC", "RRC"] as ModuleCode[]).map((m) => (
                      <div key={m} className="rounded-lg border bg-muted/40 p-3">
                        <p className="text-muted-foreground">{m}</p>
                        <p className="text-lg font-semibold">{scores.normalized[m]} / {MODULE_MAX[m]}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-emerald-100">
                <CardHeader>
                  <CardTitle className="text-sm">Top 5 risk drivers</CardTitle>
                  <CardDescription className="text-xs">
                    Ranked signals to guide the adaptation plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {topRisks.map((r, idx) => (
                    <div key={r.key} className="rounded-xl border border-emerald-100 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-emerald-950">
                          {r.title}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            r.severity >= 70 ? "border-red-200 text-red-800" : r.severity >= 40 ? "border-amber-200 text-amber-900" : "border-emerald-200 text-emerald-800"
                          )}
                        >
                          Severity: {r.severity}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Module: {r.module}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Rank: {idx + 1}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(pages.length - 2)}>
                  Back to questions
                </Button>
                <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep(0)}>
                  Start over
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </fieldset>
    </div>
  )
}
