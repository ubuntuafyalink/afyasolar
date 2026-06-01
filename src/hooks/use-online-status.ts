"use client"

import { useSyncExternalStore } from "react"

/**
 * Tracks browser connectivity for the low-connectivity rural experience.
 * Returns `true` while online. Uses useSyncExternalStore so SSR and the first
 * client render agree (server snapshot is always online), avoiding both
 * hydration mismatches and setState-in-effect.
 */
function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getSnapshot(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine
}

function getServerSnapshot(): boolean {
  return true
}

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
