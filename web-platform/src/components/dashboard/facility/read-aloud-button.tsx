"use client"

import { Volume2, Square } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useSpeech } from "@/hooks/use-speech"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Read-aloud control. Speaks the given text in the current language (sw-TZ /
 * en-US) via on-device TTS. Renders nothing where speechSynthesis is
 * unavailable, so it never shows a dead button.
 */
export function ReadAloudButton({ text, className }: { text: string; className?: string }) {
  const { locale, t } = useFacilityPreferences()
  const { supported, speaking, speak, stop } = useSpeech()

  if (!supported) return null

  const lang = locale === "sw" ? "sw-TZ" : "en-US"

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("min-h-9 gap-1.5", className)}
      onClick={() => (speaking ? stop() : speak(text, lang))}
      aria-label={speaking ? t("toolbar.stop") : t("toolbar.readAloud")}
    >
      {speaking ? <Square className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
      {speaking ? t("toolbar.stop") : t("toolbar.readAloud")}
    </Button>
  )
}
