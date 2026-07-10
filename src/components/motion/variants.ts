/**
 * Small, reusable Framer Motion variants for the facility dashboards. Designed
 * for the lightweight `m.` components under LazyMotionProvider: short (<=300ms),
 * ease-out, transform/opacity only. MotionConfig reducedMotion="user" already
 * disables these for users who prefer reduced motion, so no per-variant guard is
 * needed.
 */
import type { Variants } from "framer-motion"

const EASE_OUT = [0.16, 1, 0.3, 1] as const

/** Fade + slight upward slide. Use for sections and grid children. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
}

/** Parent that staggers its children's entrance. Pair with fadeInUp/scaleIn. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
}

/** Gentle scale + fade. Use for KPI tiles / cards. */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: EASE_OUT } },
}

/** Tab-content entrance (subtle fade + small slide). */
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } },
}

/** Accordion expand/collapse (height + fade), <=250ms. */
export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0 },
  open: { height: "auto", opacity: 1, transition: { duration: 0.22, ease: EASE_OUT } },
}

/** Route/page-level content entrance. Slightly larger than fadeInUp. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
}

/** Snappy spring for interactive lift/press gestures (transform only). */
export const INTERACTIVE_SPRING = { type: "spring", stiffness: 400, damping: 30 } as const
