"use client"

import { Languages, Check } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LOCALES, type Locale } from "@/lib/i18n/dictionaries"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * EN/SW language switcher for the facility dashboard header. The current locale
 * label is always shown as text (never colour/icon alone) for accessibility.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useFacilityPreferences()
  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  const choose = (code: Locale) => {
    setLocale(code)
    toast.success(translateConfirm(code))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5"
          aria-label={`${t("toolbar.language")}: ${current.nativeLabel}`}
        >
          <Languages className="size-4" aria-hidden />
          <span className="font-semibold uppercase">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t("toolbar.language")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => choose(l.code)}
            className="flex items-center justify-between gap-3"
          >
            <span>{l.nativeLabel}</span>
            {l.code === locale ? (
              <Check className="size-4 text-primary" aria-label="Selected" />
            ) : (
              <span className="text-xs uppercase text-muted-foreground">{l.code}</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The confirmation toast should be in the language just chosen, so read it
// directly from the dictionary rather than the (not-yet-updated) hook value.
function translateConfirm(code: Locale): string {
  return code === "sw" ? "Lugha imewekwa kuwa Kiswahili" : "Language set to English"
}
