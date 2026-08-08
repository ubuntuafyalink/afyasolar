"use client"

import { motion, useReducedMotion } from "framer-motion"
import { Sparkles } from "lucide-react"

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * Animated overlay shown while the AI re-forecasts a new window. Wrap in
 * <AnimatePresence> and render inside a `relative` container. Transform/opacity
 * only; falls back to a static label under prefers-reduced-motion. Shared by
 * the facility AI Forecast card and the admin Portfolio Forecast card.
 */
export function PredictingOverlay({ months }: { months: number }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      key="predicting"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-card/70 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <motion.div
        animate={reduced ? undefined : { scale: [1, 1.18, 1], rotate: [0, 10, -10, 0] }}
        transition={reduced ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="flex size-11 items-center justify-center rounded-full bg-primary/10"
      >
        <Sparkles className="size-5 text-primary" aria-hidden />
      </motion.div>

      <p className="text-sm font-medium text-foreground">
        Forecasting next {months} months
        {reduced ? "…" : null}
        {!reduced ? (
          <span className="inline-flex">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
                aria-hidden
              >
                .
              </motion.span>
            ))}
          </span>
        ) : null}
      </p>

      {/* Indeterminate shimmer bar (translateX only). */}
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
        {!reduced ? (
          <motion.div
            className="h-full w-1/2 rounded-full bg-primary"
            animate={{ x: ["-120%", "260%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-primary" />
        )}
      </div>
    </motion.div>
  )
}
