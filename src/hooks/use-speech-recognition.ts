"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Thin wrapper over the browser Web Speech API (SpeechRecognition) for
 * speech-to-text. Free and on-device; support varies by browser (best in
 * Chrome/Edge). Returns { supported, listening, transcript, start, stop }.
 * Pair with useSpeech (src/hooks/use-speech.ts) for text-to-speech.
 *
 * The SpeechRecognition types are not in the standard TS lib, so we use a
 * minimal local typing and feature-detect the vendor-prefixed constructor.
 */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useSpeechRecognition(opts: { lang?: string; onResult?: (text: string) => void } = {}) {
  const lang = opts.lang ?? "en-US"
  const [supported] = useState(() => getRecognitionCtor() != null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  // Keep the latest callback in a ref so the recognition handler is never stale
  // and we avoid syncing transcript through state-in-effect.
  const onResultRef = useRef(opts.onResult)
  useEffect(() => {
    onResultRef.current = opts.onResult
  }, [opts.onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let text = ""
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript
      }
      onResultRef.current?.(text)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }, [lang])

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort()
    }
  }, [])

  return { supported, listening, start, stop }
}
