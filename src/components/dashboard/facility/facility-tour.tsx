"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { X, ArrowRight, ArrowLeft, Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { useFacilityPreferences } from "./facility-preferences-provider"

const SEEN_KEY = "afya.facility.tourSeen"
/** Dispatch this on window to (re)start the tour, e.g. from the Help page. */
export const START_TOUR_EVENT = "afya:start-tour"

const STEPS = ["welcome", "childServices", "rcs", "climate", "notifications", "accessibility"] as const

/**
 * First-run guided tour: a short step-through of the dashboard's key areas,
 * shown once (localStorage) and replayable via the START_TOUR_EVENT. A centered
 * step modal (not anchored coachmarks) keeps it robust and accessible; motion is
 * reduced-motion-aware via LazyMotionProvider.
 */
export function FacilityTour() {
  return (
    <LazyMotionProvider>
      <FacilityTourInner />
    </LazyMotionProvider>
  )
}

function FacilityTourInner() {
  const { t } = useFacilityPreferences()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const seen = window.localStorage.getItem(SEEN_KEY) === "1"
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time first-visit check
    if (!seen) setOpen(true)
    const onStart = () => {
      setStep(0)
      setOpen(true)
    }
    window.addEventListener(START_TOUR_EVENT, onStart)
    return () => window.removeEventListener(START_TOUR_EVENT, onStart)
  }, [])

  const finish = () => {
    setOpen(false)
    window.localStorage.setItem(SEEN_KEY, "1")
  }

  const key = STEPS[step]
  const isLast = step === STEPS.length - 1

  return (
    <AnimatePresence>
      {open && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tour-title"
        >
          <m.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 16, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-primary" aria-hidden />
                <h2 id="tour-title" className="text-lg font-semibold text-foreground">
                  {t(`tour.${key}.title`)}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={finish}
                aria-label={t("tour.skip")}
                className={cn("size-8 shrink-0", FOCUS_RING)}
              >
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{t(`tour.${key}.body`)}</p>

            {/* Progress dots */}
            <div className="mt-4 flex items-center gap-1.5" aria-hidden>
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === step ? "w-5 bg-primary" : "w-1.5 bg-muted",
                  )}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className={cn("gap-1.5", FOCUS_RING)}
              >
                <ArrowLeft className="size-4" aria-hidden />
                {t("tour.back")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {step + 1} / {STEPS.length}
              </span>
              <Button
                size="sm"
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                className={cn("gap-1.5", FOCUS_RING)}
              >
                {isLast ? t("tour.finish") : t("tour.next")}
                {!isLast && <ArrowRight className="size-4" aria-hidden />}
              </Button>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
