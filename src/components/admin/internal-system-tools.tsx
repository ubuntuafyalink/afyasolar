"use client"

import { useMemo, useState } from "react"
import { m } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useFacilities } from "@/hooks/use-facilities"
import { ManualTelemetryForm } from "@/components/energy/manual-telemetry-form"
import { SlidersHorizontal } from "lucide-react"
import { LazyMotionProvider } from "@/components/motion/lazy-motion-provider"
import { fadeInUp } from "@/components/motion/variants"

/**
 * Internal admin-only tools kept outside the facility impersonation UI.
 */
export function InternalSystemTools() {
  const { data: facilities, isLoading } = useFacilities()
  const [facilityId, setFacilityId] = useState<string>("")

  const sorted = useMemo(() => {
    const list = facilities ?? []
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [facilities])

  return (
    <LazyMotionProvider>
      <div className="space-y-6">
        <m.div variants={fadeInUp} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SlidersHorizontal className="h-5 w-5" />
                </span>
                Settings &amp; system tools
              </CardTitle>
              <CardDescription>
                Operational utilities for testing and support &mdash; e.g. injecting a manual telemetry sample
                before a facility&apos;s meter hardware is connected. Not shown inside the facility admin view.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md space-y-2">
                <Label>Facility</Label>
                <Select
                  value={facilityId || undefined}
                  onValueChange={setFacilityId}
                  disabled={isLoading || sorted.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading facilities…" : "Select a facility"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sorted.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </m.div>

        {facilityId ? (
          <m.div key={facilityId} variants={fadeInUp} initial="hidden" animate="show">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual telemetry sample</CardTitle>
                <CardDescription>
                  Record a sample energy reading for the selected facility (testing dashboards before meter
                  integration).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualTelemetryForm facilityId={facilityId} />
              </CardContent>
            </Card>
          </m.div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a facility to enable manual telemetry.</p>
        )}
      </div>
    </LazyMotionProvider>
  )
}
