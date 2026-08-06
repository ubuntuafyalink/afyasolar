"use client"

import { useCallback, useSyncExternalStore } from "react"

/** Status of a measure the facility has added to its adaptation plan. */
export type PlanStatus = "planned" | "in-progress" | "done"

const KEY = "afya.facility.adaptationPlan"
const EMPTY: Record<string, PlanStatus> = {}

let cache: Record<string, PlanStatus> | null = null
const listeners = new Set<() => void>()

function read(): Record<string, PlanStatus> {
  if (cache) return cache
  if (typeof window === "undefined") return EMPTY
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) || "{}") as Record<string, PlanStatus>
  } catch {
    cache = {}
  }
  return cache
}

function write(next: Record<string, PlanStatus>) {
  cache = next
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Local (no-backend) adaptation-plan tracker: a map of ECM code → status,
 * persisted to localStorage and shared across components via an external store
 * so the catalogue and the "My Plan" tab stay in sync.
 */
export function useAdaptationPlan() {
  const items = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY,
  )

  const setStatus = useCallback((code: string, status: PlanStatus) => {
    write({ ...read(), [code]: status })
  }, [])

  const remove = useCallback((code: string) => {
    const next = { ...read() }
    delete next[code]
    write(next)
  }, [])

  return { items, setStatus, remove }
}
