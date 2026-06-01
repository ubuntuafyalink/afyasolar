import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Presentational KPI / stat block. Callers pass already-computed values this
 * component fetches nothing and owns no logic. The optional left accent and the
 * icon chip share a semantic color token.
 */
const accentBar = cva('absolute inset-y-0 left-0 w-1 rounded-l-xl', {
  variants: {
    accent: {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      solar: 'bg-solar',
      destructive: 'bg-destructive',
      muted: 'bg-border',
    },
  },
  defaultVariants: { accent: 'primary' },
})

const iconChip = cva(
  'flex size-9 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5',
  {
    variants: {
      accent: {
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/15 text-warning-foreground',
        solar: 'bg-solar/15 text-solar-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        muted: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { accent: 'primary' },
  },
)

const progressFill = cva('h-full rounded-full transition-all', {
  variants: {
    accent: {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      solar: 'bg-solar',
      destructive: 'bg-destructive',
      muted: 'bg-muted-foreground/40',
    },
  },
  defaultVariants: { accent: 'primary' },
})

type StatCardAccent = NonNullable<VariantProps<typeof accentBar>['accent']>

export interface StatCardProps
  extends Omit<React.ComponentProps<typeof Card>, 'title'> {
  title: React.ReactNode
  value: React.ReactNode
  /** Decorative icon (lucide). Rendered inside a tinted chip; aria-hidden. */
  icon?: React.ReactNode
  /** Sub-label under the value (trend, period, helper text). */
  meta?: React.ReactNode
  accent?: StatCardAccent
  /** Render the left accent bar. Defaults to true. */
  showAccent?: boolean
  /** Optional 0100 progress bar rendered full-width under the content. */
  progress?: number
  /** Accessible label for the progress bar (falls back to the title when a string). */
  progressLabel?: string
}

function StatCard({
  title,
  value,
  icon,
  meta,
  accent = 'primary',
  showAccent = true,
  progress,
  progressLabel,
  className,
  ...props
}: StatCardProps) {
  const hasProgress = typeof progress === 'number'
  const clamped = hasProgress ? Math.min(Math.max(progress as number, 0), 100) : 0
  return (
    <Card
      data-slot="stat-card"
      className={cn(
        'relative gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md',
        className,
      )}
      {...props}
    >
      {showAccent ? <span aria-hidden className={accentBar({ accent })} /> : null}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
            {meta ? <div className="text-xs text-muted-foreground">{meta}</div> : null}
          </div>
          {icon ? (
            <span aria-hidden className={iconChip({ accent })}>
              {icon}
            </span>
          ) : null}
        </div>
        {hasProgress ? (
          <div
            className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(clamped)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel ?? (typeof title === 'string' ? title : undefined)}
          >
            <div className={progressFill({ accent })} style={{ width: `${clamped}%` }} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export { StatCard }
