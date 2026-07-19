"use client"

import { useEffect, useState } from "react"
import { useReducedMotion } from "framer-motion"

import { useOnlineStatus } from "@/hooks/use-online-status"

/**
 * Explicit, default-OFF demo gate. Simulated telemetry only runs when
 * NEXT_PUBLIC_DEMO_TELEMETRY === "true". With the flag unset/false this hook is
 * inert (live=false, tick stays 0) so no admin surface can show simulated curves.
 */
const DEMO_TELEMETRY_ENABLED = process.env.NEXT_PUBLIC_DEMO_TELEMETRY === "true"

/**
 * Drives the simulated live-telemetry feed (Power/Fridge). Emits an incrementing
 * `tick` on an interval that consumers feed to the seed's `getLive*` helpers to
 * produce ticking readings no network. Disabled unless the demo flag is on; also
 * PAUSES when the device is offline, the tab is hidden, or the user prefers
 * reduced motion, which keeps it honest (offline) and cheap on low-end devices.
 */
export function useSimulatedTelemetry(intervalMs = 4000): {
  tick: number
  lastUpdated: Date | null
  live: boolean
} {
  const online = useOnlineStatus()
  const reducedMotion = useReducedMotion()
  const [tick, setTick] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const onVisibility = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  const live = DEMO_TELEMETRY_ENABLED && online && visible && !reducedMotion

  useEffect(() => {
    if (!live) return
    const id = window.setInterval(() => {
      setTick((value) => value + 1)
      setLastUpdated(new Date())
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [live, intervalMs])

  return { tick, lastUpdated, live }
}
