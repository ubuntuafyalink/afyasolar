"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Square, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}

/**
 * Spec 8.2 "Ripoti": voice-note recorder for the "Floods or any problem" field.
 * Records locally via MediaRecorder and plays back — nothing is uploaded.
 * Falls back gracefully where MediaRecorder is unavailable.
 */
export function VoiceNoteRecorder({
  onChange,
}: {
  /** Notifies the parent whether a voice note currently exists. */
  onChange?: (hasNote: boolean) => void
}) {
  const [supported, setSupported] = useState(true)
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof MediaRecorder === "undefined" ||
      !navigator.mediaDevices
    ) {
      setSupported(false)
    }
    return () => {
      if (url) URL.revokeObjectURL(url)
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        if (url) URL.revokeObjectURL(url)
        setUrl(URL.createObjectURL(blob))
        onChange?.(true)
        stream.getTracks().forEach((t) => t.stop())
      }
      mr.start()
      mediaRef.current = mr
      setRecording(true)
      setSeconds(0)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setSupported(false)
    }
  }

  function stop() {
    mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }

  function remove() {
    if (url) URL.revokeObjectURL(url)
    setUrl(null)
    setSeconds(0)
    onChange?.(false)
  }

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Voice recording isn&apos;t available on this device — please type the problem above.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {!recording ? (
          <Button type="button" variant="outline" className="min-h-11" onClick={start}>
            <Mic className="size-4" aria-hidden /> {url ? "Re-record" : "Record voice note"}
          </Button>
        ) : (
          <Button type="button" variant="destructive" className="min-h-11" onClick={stop}>
            <Square className="size-4" aria-hidden /> Stop ({formatSeconds(seconds)})
          </Button>
        )}
        {recording ? (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <span className={cn("size-2 rounded-full bg-destructive", "animate-pulse")} aria-hidden />
            Recording…
          </span>
        ) : null}
        {url && !recording ? (
          <Button type="button" variant="ghost" size="sm" onClick={remove}>
            <Trash2 className="size-4" aria-hidden /> Remove
          </Button>
        ) : null}
      </div>
      {url && !recording ? (
        <audio src={url} controls className="w-full" aria-label="Recorded voice note" />
      ) : null}
    </div>
  )
}
