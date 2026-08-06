import { FlaskConical } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Small inline badge that marks a surface as fed by local demo/sample data
 * rather than a live source. Used on every `[data]` facility feature shell so
 * the demo origin is always visible to the user.
 */
export function DemoDataBadge({
  className,
  label = "Demo data",
}: {
  className?: string
  label?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning-foreground",
        className,
      )}
    >
      <FlaskConical aria-hidden className="size-3" />
      {label}
    </span>
  )
}
