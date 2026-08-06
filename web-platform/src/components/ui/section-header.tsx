import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Presentational page/section heading row: title + optional description on the
 * left, optional actions on the right. Establishes a consistent type hierarchy.
 */
export interface SectionHeaderProps
  extends Omit<React.ComponentProps<'div'>, 'title'> {
  title: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned actions (buttons, filters). */
  actions?: React.ReactNode
  /** Heading size. `page` for top-of-page titles, `section` for in-page groups. */
  as?: 'page' | 'section'
}

function SectionHeader({
  title,
  description,
  actions,
  as = 'section',
  className,
  ...props
}: SectionHeaderProps) {
  return (
    <div
      data-slot="section-header"
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h2
          className={cn(
            'font-semibold tracking-tight text-foreground',
            as === 'page' ? 'text-2xl' : 'text-lg',
          )}
        >
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

export { SectionHeader }
