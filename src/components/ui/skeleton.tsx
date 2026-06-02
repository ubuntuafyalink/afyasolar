import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}

/** Loading placeholder matching the <StatCard> footprint. */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("gap-0 py-0", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="w-full space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="size-9 rounded-lg" />
      </CardContent>
    </Card>
  )
}

/** Loading placeholder for a data table body. */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-5 flex-1", c === 0 && "max-w-[40%]")}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/** Loading placeholder for a chart panel. */
export function ChartSkeleton({
  className,
  height = "h-64",
}: {
  className?: string
  height?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-4 w-40" />
      <Skeleton className={cn("w-full rounded-lg", height)} />
    </div>
  )
}

/** Responsive grid of StatCard placeholders for a KPI row. */
export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}

/** Vertical list of card rows (icon chip + two text lines + trailing badge). */
export function CardListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/** Full-page dashboard placeholder: header bars + KPI grid + optional chart + list. */
export function DashboardSkeleton({
  stats = 4,
  withChart = true,
  className,
}: {
  stats?: number
  withChart?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <StatGridSkeleton count={stats} />
      {withChart ? (
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <ChartSkeleton height="h-[260px]" />
          </CardContent>
        </Card>
      ) : null}
      <Card className="overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <CardListSkeleton rows={5} />
        </CardContent>
      </Card>
    </div>
  )
}
