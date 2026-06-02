"use client"

import { HelpCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { FACILITY_BOTTOM_NAV_ITEMS, type NavSection } from "@/lib/dashboard/facility-nav"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useT } from "@/components/dashboard/facility/facility-preferences-provider"

/**
 * Spec 8.2 bottom navigation an OPTIONAL mobile-only enhancement (`<lg` only;
 * the sidebar stays the primary, desktop-first navigation). Exactly five tabs:
 * Today, Fridge, Power, Reports, and a help button. Tap targets are ≥44px.
 */
export function FacilityBottomNav({
  active,
  onSelect,
  onHelp,
  className,
}: {
  active: NavSection
  onSelect: (section: NavSection) => void
  /** Opens a help affordance (the shell opens the full menu with support links). */
  onHelp: () => void
  className?: string
}) {
  const t = useT()
  return (
    <nav
      aria-label={t("shell.quickNav")}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden",
        className,
      )}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {FACILITY_BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.id
          return (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                  FOCUS_RING,
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span>{t(`nav.${item.id}`)}</span>
              </button>
            </li>
          )
        })}
        <li className="flex-1">
          <button
            type="button"
            onClick={onHelp}
            className={cn(
              "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              FOCUS_RING,
            )}
          >
            <HelpCircle className="size-5" aria-hidden />
            <span>{t("nav.help")}</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}
