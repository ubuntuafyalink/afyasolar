import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Presentational KPI / stat block. Callers pass already-computed values — this
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
}

function StatCard({
  title,
  value,
  icon,
  meta,
  accent = 'primary',
  showAccent = true,
  className,
  ...props
}: StatCardProps) {
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
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {meta ? (
            <div className="text-xs text-muted-foreground">{meta}</div>
          ) : null}
        </div>
        {icon ? (
          <span aria-hidden className={iconChip({ accent })}>
            {icon}
          </span>
        ) : null}
      </CardContent>
    </Card>
  )
}

export { StatCard }
