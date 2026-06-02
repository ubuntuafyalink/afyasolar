"use client"

import { LazyMotion, MotionConfig, domAnimation } from "framer-motion"
import type { ReactNode } from "react"

/**
 * Wraps the new facility sections with framer-motion's LazyMotion (DOM feature
 * bundle only keeps the client payload small for low-end rural devices) and a
 * MotionConfig that honours the user's reduced-motion preference globally.
 *
 * Inside this provider, use the lightweight `m` components (e.g. `m.div`) from
 * `framer-motion` rather than `motion`, so the heavy animation bundle is not
 * pulled in. Keep motion subtle and ≤300ms.
 */
export function LazyMotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
    </MotionConfig>
  )
}
