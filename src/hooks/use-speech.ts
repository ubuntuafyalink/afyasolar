"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * Thin wrapper over the Web Speech API (speechSynthesis) for read-aloud support.
 * Returns whether TTS is supported, the speaking state, and speak/stop. No
 * network runs on-device. Cancels any in-flight utterance on unmount.
 */
export function useSpeech() {
  const [supported] = useState(
    () => typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined",
  )
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback(
    (text: string, lang: string) => {
      if (!supported) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      setSpeaking(true)
      window.speechSynthesis.speak(utterance)
    },
    [supported],
  )

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  return { supported, speaking, speak, stop }
}
