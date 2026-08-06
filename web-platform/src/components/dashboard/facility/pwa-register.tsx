"use client"

import { useEffect } from "react"

/**
 * Registers the offline service worker (public/sw-offline.js) so the dashboard
 * shell and static assets are cached for offline use. Production-only in dev a
 * service worker would cache _next chunks and break HMR. Renders nothing.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    const register = () => {
      navigator.serviceWorker.register("/sw-offline.js").catch(() => {
        // Registration is best-effort; offline support degrades gracefully.
      })
    }
    if (document.readyState === "complete") register()
    else window.addEventListener("load", register, { once: true })
  }, [])

  return null
}
