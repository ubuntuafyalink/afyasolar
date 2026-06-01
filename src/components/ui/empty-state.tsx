import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * Presentational zero-data placeholder. The optional action is supplied by the
 * caller via children (e.g. a <Button>) this component triggers nothing.
 */
export interface EmptyStateProps
  extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Decorative icon (lucide). Rendered inside a muted chip; aria-hidden. */
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}

function EmptyState({
  icon,
  title,
  description,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden
          className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&>svg]:size-6"
        >
          {icon}
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  )
}

export { EmptyState }
