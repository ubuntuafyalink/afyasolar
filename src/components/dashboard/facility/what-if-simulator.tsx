"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, FlaskConical, Play } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DemoDataBadge } from "@/components/ui/demo-data-badge"
import { cn, formatCurrency } from "@/lib/utils"
import { getWhatIfResult, type WhatIfScenario, type WhatIfResult } from "@/lib/dashboard/facility-demo-data"

const SCENARIOS: { value: WhatIfScenario; label: string }[] = [
  { value: "add-fridge", label: "Add a second fridge" },
  { value: "add-battery", label: "Add more battery storage" },
  { value: "led-retrofit", label: "Switch all lights to LED" },
  { value: "late-rains", label: "The rains start late" },
]

/**
 * Spec 11.3 "Simulate": a what-if simulator. Pick a scenario and see the
 * estimated effect on service hours, monthly cost and resilience.
 *
 * [data] — fed by the local demo module. TODO: wire the real simulation engine.
 */
export function WhatIfSimulator({ facilityId }: { facilityId?: string }) {
  const [scenario, setScenario] = useState<WhatIfScenario>("add-battery")
  const [result, setResult] = useState<WhatIfResult | null>(null)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="size-5 text-primary" aria-hidden /> What-if simulator
          </CardTitle>
          <DemoDataBadge />
        </div>
        <p className="text-xs text-muted-foreground">See the likely effect of a change before you make it.</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1">
            <label className="text-xs text-muted-foreground" htmlFor="scenario">
              Scenario
            </label>
            <Select value={scenario} onValueChange={(v) => setScenario(v as WhatIfScenario)}>
              <SelectTrigger id="scenario">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCENARIOS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="min-h-10" onClick={() => setResult(getWhatIfResult(scenario, facilityId))}>
            <Play className="size-4" aria-hidden /> Simulate
          </Button>
        </div>

        {result ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Delta label="Service hours" value={`${result.deltaServiceHours > 0 ? "+" : ""}${result.deltaServiceHours} h`} good={result.deltaServiceHours >= 0} />
              <Delta
                label="Monthly cost"
                value={`${result.deltaMonthlyCostTsh > 0 ? "+" : "−"}${formatCurrency(Math.abs(result.deltaMonthlyCostTsh))}`}
                good={result.deltaMonthlyCostTsh <= 0}
              />
              <Delta
                label="Resilience"
                value={`${result.deltaResiliencePoints > 0 ? "+" : ""}${result.deltaResiliencePoints} pts`}
                good={result.deltaResiliencePoints >= 0}
              />
            </div>
            <p className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{result.note}</p>
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Choose a scenario and tap Simulate to see the estimated impact.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function Delta({ label, value, good }: { label: string; value: string; good: boolean }) {
  const Icon = good ? ArrowUp : ArrowDown
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("flex items-center gap-1 text-lg font-bold", good ? "text-success" : "text-destructive")}>
        <Icon className="size-4" aria-hidden />
        {value}
      </p>
    </div>
  )
}
