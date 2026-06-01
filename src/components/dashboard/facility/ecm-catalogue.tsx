"use client"

import { Plus } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/utils"
import { ECM_CATALOGUE, type EcmHorizon } from "@/lib/dashboard/ecm-catalogue"

const HORIZON_LABEL: Record<EcmHorizon, string> = {
  immediate: "Immediate",
  medium: "Medium term",
  capital: "Capital",
}

/**
 * Spec 9.5: the Energy Conservation Measures catalogue as a list of actions the
 * facility can add to its plan. Adding is local-only (a toast) — no backend.
 */
export function EcmCatalogue() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">ECM catalogue</CardTitle>
        <p className="text-xs text-muted-foreground">
          A sample of the Energy Conservation Measures relevant to your facility.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {ECM_CATALOGUE.map((ecm) => (
            <div key={ecm.code} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{ecm.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ecm.code} · {ecm.category}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-[10px]">
                  {HORIZON_LABEL[ecm.horizon]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{ecm.description}</p>
              <dl className="grid grid-cols-3 gap-1 text-center text-[11px]">
                <div className="rounded bg-muted/50 p-1.5">
                  <dt className="text-muted-foreground">Cost</dt>
                  <dd className="font-semibold text-foreground">{formatCurrency(ecm.indicativeCostTsh)}</dd>
                </div>
                <div className="rounded bg-muted/50 p-1.5">
                  <dt className="text-muted-foreground">Saving/mo</dt>
                  <dd className="font-semibold text-foreground">{formatCurrency(ecm.monthlySavingTsh)}</dd>
                </div>
                <div className="rounded bg-muted/50 p-1.5">
                  <dt className="text-muted-foreground">Gain</dt>
                  <dd className="font-semibold text-success">+{ecm.resilienceGainPoints}</dd>
                </div>
              </dl>
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => toast.success(`${ecm.title} added to your plan.`)}
              >
                <Plus className="size-4" aria-hidden /> Add to plan
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
