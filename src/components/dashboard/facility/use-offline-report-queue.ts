"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Spec 8.2 "Ripoti": offline-first daily reports. Submissions are written to
 * IndexedDB instantly so they survive outages, then "synced" in the background.
 *
 * The IndexedDB persistence is REAL and local-only. The sync to the API + DHIS2
 * queue is SIMULATED here (a local status transition) — no network write is
 * performed. TODO: wire the real submit + DHIS2 sync queue per spec Part 7/8.
 */
const DB_NAME = "afyasolar-facility"
const STORE = "daily-reports"
const DB_VERSION = 1

export type DailyReportDraft = {
  facilityId?: string
  date: string
  patients: number
  childrenVaccinated: number
  deliveries: number
  problemNote: string
  hasVoiceNote: boolean
}

export type ReportStatus = "queued" | "syncing" | "synced"

export type QueuedReport = DailyReportDraft & {
  id: string
  status: ReportStatus
  createdAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function readAll(): Promise<QueuedReport[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => resolve((req.result as QueuedReport[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

async function put(report: QueuedReport): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(report)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function useOfflineReportQueue(facilityId?: string) {
  const [reports, setReports] = useState<QueuedReport[]>([])
  const [supported, setSupported] = useState(
    () => typeof window === "undefined" || "indexedDB" in window,
  )
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  )
  const idRef = useRef(0)

  useEffect(() => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      return
    }
    readAll()
      .then((all) =>
        setReports(
          all
            .filter((r) => !facilityId || r.facilityId === facilityId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      )
      .catch(() => setSupported(false))

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    return () => {
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [facilityId])

  const enqueue = useCallback(
    async (draft: DailyReportDraft) => {
      idRef.current += 1
      const report: QueuedReport = {
        ...draft,
        facilityId,
        id: `report-${Date.now()}-${idRef.current}`,
        status: "queued",
        createdAt: new Date().toISOString(),
      }
      if (supported) {
        try {
          await put(report)
        } catch {
          // IndexedDB unavailable — keep it in memory so the user still sees it.
        }
      }
      setReports((prev) => [report, ...prev])

      // Simulated background sync (no network). DHIS2 queue is a stub.
      if (navigator.onLine) {
        const mark = async (status: ReportStatus) => {
          const updated = { ...report, status }
          if (supported) {
            try {
              await put(updated)
            } catch {
              /* ignore */
            }
          }
          setReports((prev) => prev.map((r) => (r.id === report.id ? updated : r)))
        }
        window.setTimeout(() => mark("syncing"), 600)
        window.setTimeout(() => mark("synced"), 1800)
      }
      return report
    },
    [facilityId, supported],
  )

  return { reports, enqueue, supported, online }
}
