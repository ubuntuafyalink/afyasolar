"use client"

import * as React from "react"
import { m, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"
import { fadeInUp, scaleIn, staggerContainer, pageTransition, INTERACTIVE_SPRING } from "./variants"

/**
 * Reusable Framer Motion primitives for the whole app. All are designed for the
 * lightweight `m.` components under LazyMotionProvider (hoisted in providers.tsx)
 * and animate transform/opacity only. Each honours reduced motion — either via
 * the global MotionConfig (reducedMotion="user", which strips movement) or an
 * explicit useReducedMotion() guard on gesture props.
 */

type DivProps = React.ComponentProps<typeof m.div>

/** Section / block entrance: fade + gentle rise on mount. */
export function MotionSection({ className, children, ...props }: DivProps) {
  return (
    <m.div variants={pageTransition} initial="hidden" animate="show" className={className} {...props}>
      {children}
    </m.div>
  )
}

/** Parent that staggers its children's entrance. Pair with <StaggerItem>. */
export function StaggerGroup({ className, children, ...props }: DivProps) {
  return (
    <m.div variants={staggerContainer} initial="hidden" animate="show" className={className} {...props}>
      {children}
    </m.div>
  )
}

/** Child of <StaggerGroup>: fade + rise, orchestrated by the parent. */
export function StaggerItem({ className, children, ...props }: DivProps) {
  return (
    <m.div variants={fadeInUp} className={className} {...props}>
      {children}
    </m.div>
  )
}

/** Child of <StaggerGroup> using a scale+fade entrance (for KPI tiles). */
export function StaggerTile({ className, children, ...props }: DivProps) {
  return (
    <m.div variants={scaleIn} className={className} {...props}>
      {children}
    </m.div>
  )
}

export interface MotionCardProps extends React.ComponentProps<typeof Card> {
  /** Enable spring hover-lift + press feedback. Default true. */
  interactive?: boolean
}

/**
 * Card with a spring hover-lift and subtle press. The lift is a transform (motion);
 * the shadow deepens via a CSS transition (never animate box-shadow on the JS
 * thread). Reduced-motion users get a static card.
 */
export function MotionCard({ className, interactive = true, children, ...props }: MotionCardProps) {
  const reduce = useReducedMotion()
  const gesture = interactive && !reduce

  return (
    <m.div
      whileHover={gesture ? { y: -3 } : undefined}
      whileTap={gesture ? { scale: 0.995 } : undefined}
      transition={INTERACTIVE_SPRING}
      className="h-full"
    >
      <Card
        className={cn(
          "h-full",
          interactive && "cursor-pointer transition-shadow duration-200 hover:shadow-md",
          className,
        )}
        {...props}
      >
        {children}
      </Card>
    </m.div>
  )
}

/** Wrap any custom clickable element to add a subtle spring press. */
export function Pressable({ className, children, ...props }: DivProps) {
  const reduce = useReducedMotion()
  return (
    <m.div
      whileTap={reduce ? undefined : { scale: 0.97 }}
      transition={INTERACTIVE_SPRING}
      className={className}
      {...props}
    >
      {children}
    </m.div>
  )
}
