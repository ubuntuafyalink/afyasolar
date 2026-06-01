"use client"

import { CloudOff } from "lucide-react"
import { AnimatePresence, m } from "framer-motion"

import { useOnlineStatus } from "@/hooks/use-online-status"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { useFacilityPreferences } from "./facility-preferences-provider"

/**
 * Prominent banner shown when the device loses connectivity. Reassures the
 * facility user that the dashboard still works on the last saved data the
 * core of the low-connectivity rural experience. Motion is reduced-motion-aware
 * via LazyMotionProvider's MotionConfig.
 */
export function OfflineBanner() {
  return (
    <LazyMotionProvider>
      <OfflineBannerInner />
    </LazyMotionProvider>
  )
}

function OfflineBannerInner() {
  const online = useOnlineStatus()
  const { t } = useFacilityPreferences()

  return (
    <AnimatePresence>
      {!online && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="status"
          aria-live="assertive"
          className="overflow-hidden border-b border-warning/40 bg-warning/15"
        >
          <div className="mx-auto flex max-w-7xl items-start gap-2.5 px-4 py-2.5 sm:px-6 lg:px-8">
            <CloudOff className="mt-0.5 size-4 shrink-0 text-warning-foreground" aria-hidden />
            <p className="text-sm text-warning-foreground">{t("toolbar.offlineBanner")}</p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}
