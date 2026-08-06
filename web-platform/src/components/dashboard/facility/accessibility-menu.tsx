"use client"

import { Accessibility, Contrast, Type, BookOpenText, Eye, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Accessibility controls for the facility dashboard header: high-contrast and
 * larger-text toggles (reduced-motion is honoured globally via MotionConfig).
 * Each toggle is a labelled switch with a Switch role; the whole menu is
 * keyboard-operable.
 */
export function AccessibilityMenu() {
  const {
    highContrast,
    setHighContrast,
    largeText,
    setLargeText,
    dyslexiaFont,
    setDyslexiaFont,
    colorBlindSafe,
    setColorBlindSafe,
    reset,
    t,
  } = useFacilityPreferences()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label={t("toolbar.accessibility")}
        >
          <Accessibility className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("toolbar.accessibility")}</DropdownMenuLabel>
        <p className="px-2 pb-1 text-xs text-muted-foreground">{t("toolbar.accessibilityDesc")}</p>
        <DropdownMenuSeparator />

        <ToggleRow
          icon={<Contrast className="size-4 text-muted-foreground" aria-hidden />}
          title={t("toolbar.highContrast")}
          desc={t("toolbar.highContrastDesc")}
          checked={highContrast}
          onCheckedChange={setHighContrast}
        />
        <ToggleRow
          icon={<Type className="size-4 text-muted-foreground" aria-hidden />}
          title={t("toolbar.largeText")}
          desc={t("toolbar.largeTextDesc")}
          checked={largeText}
          onCheckedChange={setLargeText}
        />
        <ToggleRow
          icon={<BookOpenText className="size-4 text-muted-foreground" aria-hidden />}
          title={t("toolbar.dyslexiaFont")}
          desc={t("toolbar.dyslexiaFontDesc")}
          checked={dyslexiaFont}
          onCheckedChange={setDyslexiaFont}
        />
        <ToggleRow
          icon={<Eye className="size-4 text-muted-foreground" aria-hidden />}
          title={t("toolbar.colorBlind")}
          desc={t("toolbar.colorBlindDesc")}
          checked={colorBlindSafe}
          onCheckedChange={setColorBlindSafe}
        />

        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={reset} className="gap-2">
          <RotateCcw className="size-4" aria-hidden />
          {t("toolbar.reset")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ToggleRow({
  icon,
  title,
  desc,
  checked,
  onCheckedChange,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  // A label wrapping the Switch gives a large, keyboard- and screen-reader-
  // friendly target; clicking the text toggles the switch.
  return (
    <label className="flex cursor-pointer items-start gap-3 px-2 py-2 text-sm hover:bg-accent/50 rounded-sm">
      <span className="mt-0.5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={title} />
    </label>
  )
}
