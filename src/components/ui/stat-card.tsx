import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

/** Trend indicator shown as a small chip beside the value. */
export type StatDelta = {
  /** Numeric (rendered as ±N%) or a ready-made string. */
  value: number | string
  /** Explicit direction; inferred from a numeric value's sign when omitted. */
  direction?: 'up' | 'down' | 'neutral'
  /** Optional trailing context, e.g. "vs last 30d". */
  label?: string
  /** For metrics where a rise is bad (alerts, outages), flip the colour. */
  invertColor?: boolean
}

function DeltaChip({ delta }: { delta: StatDelta }) {
  const dir =
    delta.direction ??
    (typeof delta.value === 'number'
      ? delta.value > 0
        ? 'up'
        : delta.value < 0
          ? 'down'
          : 'neutral'
      : 'neutral')
  const good = delta.invertColor ? dir === 'down' : dir === 'up'
  const variant = dir === 'neutral' ? 'muted' : good ? 'successSoft' : 'destructiveSoft'
  const Icon = dir === 'up' ? ArrowUp : dir === 'down' ? ArrowDown : Minus
  const text = typeof delta.value === 'number' ? `${Math.abs(delta.value)}%` : delta.value
  return (
    <Badge variant={variant} className="gap-0.5 px-1.5 py-0 text-[11px] font-semibold">
      <Icon className="size-3" aria-hidden />
      {text}
      {delta.label ? <span className="ml-0.5 font-normal opacity-80">{delta.label}</span> : null}
    </Badge>
  )
}

export interface StatCardProps
  extends Omit<React.ComponentProps<typeof Card>, 'title'> {
  title: React.ReactNode
  value: React.ReactNode
  /** Decorative icon (lucide). Rendered inside a tinted chip; aria-hidden. */
  icon?: React.ReactNode
  /** Sub-label under the value (trend, period, helper text). */
  meta?: React.ReactNode
  /** Optional trend chip shown beside the value. */
  delta?: StatDelta
  accent?: StatCardAccent
  /** Render the left accent bar. Defaults to true. */
  showAccent?: boolean
  /** Add a subtle hover-lift + pointer (for cards that navigate/drill in). */
  interactive?: boolean
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
  delta,
  accent = 'primary',
  showAccent = true,
  interactive = false,
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
        'relative gap-0 overflow-hidden py-0 transition-[transform,box-shadow] duration-200',
        interactive
          ? 'cursor-pointer motion-safe:hover:-translate-y-0.5 hover:shadow-md'
          : 'hover:shadow-md',
        className,
      )}
      {...props}
    >
      {showAccent ? <span aria-hidden className={accentBar({ accent })} /> : null}
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
              {delta ? <DeltaChip delta={delta} /> : null}
            </div>
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
