"use client"

import { useEffect, useRef, useState } from "react"
import { useReducedMotion } from "framer-motion"

/**
 * Counts up to `value` on mount / when value changes, for premium KPI tiles.
 * Honors prefers-reduced-motion (renders the final value instantly) and never
 * changes the underlying data - purely a display animation. Uses requestAnimation
 * Frame (no extra deps beyond framer-motion's useReducedMotion).
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 700,
  prefix = "",
  suffix = "",
  className,
}: {
  value: number
  decimals?: number
  durationMs?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(() => (reduce ? value : 0))
  const fromRef = useRef(reduce ? value : 0)

  useEffect(() => {
    const from = fromRef.current
    const to = value
    if (from === to) return

    // Reduced motion (or no duration): jump to the value on the next frame
    // (scheduled, never a synchronous setState inside the effect body).
    if (reduce || durationMs <= 0) {
      fromRef.current = to
      const id = requestAnimationFrame(() => setDisplay(to))
      return () => cancelAnimationFrame(id)
    }

    const start = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setDisplay(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = to
    })
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs, reduce])

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  return (
    <span className={className} aria-label={`${prefix}${fmt(value)}${suffix}`}>
      {prefix}
      {fmt(display)}
      {suffix}
    </span>
  )
}
