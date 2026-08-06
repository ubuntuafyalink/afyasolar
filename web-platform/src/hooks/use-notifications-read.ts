"use client"

import { useCallback, useSyncExternalStore } from "react"

const KEY = "afya.facility.notificationsRead"
const EMPTY: string[] = []

let cache: string[] | null = null
const listeners = new Set<() => void>()

function read(): string[] {
  if (cache) return cache
  if (typeof window === "undefined") return EMPTY
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) || "[]") as string[]
  } catch {
    cache = []
  }
  return cache
}

function write(next: string[]) {
  cache = next
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Tracks which notification ids the facility has read, persisted to localStorage
 * and shared across components via an external store. No backend.
 */
export function useNotificationsRead() {
  const readIds = useSyncExternalStore(subscribe, read, () => EMPTY)

  const isRead = useCallback((id: string) => readIds.includes(id), [readIds])
  const markRead = useCallback((id: string) => {
    const cur = read()
    if (!cur.includes(id)) write([...cur, id])
  }, [])
  const markAllRead = useCallback((ids: string[]) => {
    const cur = read()
    const merged = Array.from(new Set([...cur, ...ids]))
    write(merged)
  }, [])

  return { readIds, isRead, markRead, markAllRead }
}
