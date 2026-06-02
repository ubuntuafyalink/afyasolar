"use client"

import { useMemo, useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { ArrowLeft, ArrowRight, Baby, HeartPulse, Mic, Send, Syringe, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { VoiceNoteRecorder } from "./voice-note-recorder"
import type { DailyReportDraft } from "./use-offline-report-queue"

/** Minimal typed wrapper over the (vendor-prefixed) Web Speech API. */
type SpeechRecognitionLike = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onerror: () => void
  onend: () => void
  start: () => void
  stop: () => void
}
function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
  return Ctor ? new Ctor() : null
}

const NUMERIC_FIELDS = [
  { key: "patients", label: "Patients seen today", icon: Users },
  { key: "childrenVaccinated", label: "Children vaccinated today", icon: Syringe },
  { key: "deliveries", label: "Mothers who delivered today", icon: Baby },
] as const

type NumericKey = (typeof NUMERIC_FIELDS)[number]["key"]

/**
 * Spec 8.2 "Ripoti": the daily report, one field at a time, each step filling
 * the screen. Four required fields patients, children vaccinated, deliveries,
 * and a problem note (text + optional voice). Voice input is offered on numeric
 * fields where the browser supports it. Submitting hands the draft to the parent
 * (which persists it offline); nothing is sent over the network here.
 */
export function DailyReportStepper({ onSubmit }: { onSubmit: (draft: Omit<DailyReportDraft, "facilityId">) => void }) {
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<Record<NumericKey, string>>({
    patients: "",
    childrenVaccinated: "",
    deliveries: "",
  })
  const [problemNote, setProblemNote] = useState("")
  const [hasVoiceNote, setHasVoiceNote] = useState(false)
  const [listening, setListening] = useState<NumericKey | null>(null)

  const totalSteps = NUMERIC_FIELDS.length + 2 // numeric fields + problem + review
  const speechAvailable = useMemo(() => getRecognition() !== null, [])

  function setNumeric(key: NumericKey, raw: string) {
    setValues((v) => ({ ...v, [key]: raw.replace(/[^\d]/g, "") }))
  }

  function listen(key: NumericKey) {
    const rec = getRecognition()
    if (!rec) return
    rec.lang = "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    setListening(key)
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? ""
      const digits = transcript.replace(/[^\d]/g, "")
      if (digits) setNumeric(key, digits)
    }
    rec.onerror = () => setListening(null)
    rec.onend = () => setListening(null)
    rec.start()
  }

  function next() {
    setStep((s) => Math.min(totalSteps - 1, s + 1))
  }
  function back() {
    setStep((s) => Math.max(0, s - 1))
  }

  function submit() {
    onSubmit({
      date: new Date().toISOString().slice(0, 10),
      patients: Number(values.patients || 0),
      childrenVaccinated: Number(values.childrenVaccinated || 0),
      deliveries: Number(values.deliveries || 0),
      problemNote: problemNote.trim(),
      hasVoiceNote,
    })
    // Reset for the next entry.
    setValues({ patients: "", childrenVaccinated: "", deliveries: "" })
    setProblemNote("")
    setHasVoiceNote(false)
    setStep(0)
  }

  const isNumericStep = step < NUMERIC_FIELDS.length
  const isProblemStep = step === NUMERIC_FIELDS.length
  const isReviewStep = step === totalSteps - 1

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="min-h-44"
        >
          {isNumericStep ? (
            <NumericStep
              icon={NUMERIC_FIELDS[step].icon}
              label={NUMERIC_FIELDS[step].label}
              value={values[NUMERIC_FIELDS[step].key]}
              onChange={(v) => setNumeric(NUMERIC_FIELDS[step].key, v)}
              onListen={speechAvailable ? () => listen(NUMERIC_FIELDS[step].key) : undefined}
              listening={listening === NUMERIC_FIELDS[step].key}
            />
          ) : isProblemStep ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <HeartPulse className="size-5 text-primary" aria-hidden />
                <label htmlFor="problem-note" className="text-base font-semibold">
                  Floods or any problem today?
                </label>
              </div>
              <Textarea
                id="problem-note"
                value={problemNote}
                onChange={(e) => setProblemNote(e.target.value)}
                placeholder="Describe any problem, or leave blank if all is well."
                rows={3}
              />
              <VoiceNoteRecorder onChange={setHasVoiceNote} />
            </div>
          ) : (
            <ReviewStep
              values={values}
              problemNote={problemNote}
              hasVoiceNote={hasVoiceNote}
            />
          )}
        </m.div>
      </AnimatePresence>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={back} disabled={step === 0}>
          <ArrowLeft className="size-4" aria-hidden /> Back
        </Button>
        {isReviewStep ? (
          <Button onClick={submit} className="min-h-11">
            <Send className="size-4" aria-hidden /> Submit report
          </Button>
        ) : (
          <Button onClick={next} className="min-h-11">
            Next <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </div>
  )
}

function NumericStep({
  icon: Icon,
  label,
  value,
  onChange,
  onListen,
  listening,
}: {
  icon: LucideIcon
  label: string
  value: string
  onChange: (v: string) => void
  onListen?: () => void
  listening: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <Icon className="size-5 text-primary" aria-hidden />
        <label htmlFor="numeric-field" className="text-base font-semibold">
          {label}
        </label>
      </div>
      <div className="flex items-center gap-2">
        <Input
          id="numeric-field"
          inputMode="numeric"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="h-14 text-2xl font-bold"
        />
        {onListen ? (
          <Button
            type="button"
            variant={listening ? "destructive" : "outline"}
            size="icon"
            className="size-14 shrink-0"
            aria-label="Speak the number"
            onClick={onListen}
          >
            <Mic className={cn("size-5", listening && "animate-pulse")} aria-hidden />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ReviewStep({
  values,
  problemNote,
  hasVoiceNote,
}: {
  values: Record<NumericKey, string>
  problemNote: string
  hasVoiceNote: boolean
}) {
  const rows = [
    { label: "Patients seen", value: values.patients || "0" },
    { label: "Children vaccinated", value: values.childrenVaccinated || "0" },
    { label: "Mothers delivered", value: values.deliveries || "0" },
    {
      label: "Problem",
      value: problemNote ? problemNote : hasVoiceNote ? "Voice note attached" : "None reported",
    },
  ]
  return (
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">Review &amp; submit</h3>
      <dl className="divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 p-3">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="max-w-[60%] text-right text-sm font-medium text-foreground">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
