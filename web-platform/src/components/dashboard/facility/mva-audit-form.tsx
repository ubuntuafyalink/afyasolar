"use client"

import { useState } from "react"
import { Save, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const FACILITY_TYPES = ["Dispensary", "Health centre", "Polyclinic", "Hospital"]
const SERVICES = ["Outpatient", "Maternity", "Vaccination (EPI)", "Laboratory", "Inpatient", "Pharmacy"]
const ENERGY_SOURCES = ["Grid", "Diesel", "Solar", "None"]

/**
 * Spec 7.1: the fifteen-parameter Minimum Viable Audit (Tier 1). Captures the
 * inputs that carry ~95% of the diagnostic value. This form computes/persists
 * nothing over the network it gathers values locally and (in a later
 * increment) feeds the three-output report. Parameters 14 & 15 are auto-computed.
 */
export function MvaAuditForm({ onComplete }: { onComplete?: () => void }) {
  const [services, setServices] = useState<string[]>([])
  const [sources, setSources] = useState<string[]>([])

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value])
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault()
        // Local only no network write.
        toast.success("Audit inputs saved on this device.")
        onComplete?.()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="facility-name" label="Facility name & GPS">
          <Input id="facility-name" placeholder="e.g. Ubuntu Dispensary (-6.81, 39.28)" />
        </Field>

        <Field id="facility-type" label="Facility type">
          <Select>
            <SelectTrigger id="facility-type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {FACILITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field id="rooms" label="Number of rooms (150)">
          <Input id="rooms" type="number" min={1} max={50} inputMode="numeric" />
        </Field>
        <Field id="staff" label="Number of staff (1500)">
          <Input id="staff" type="number" min={1} max={500} inputMode="numeric" />
        </Field>
        <Field id="patients" label="Patients per month">
          <Input id="patients" type="number" min={100} max={100000} inputMode="numeric" />
        </Field>
        <Field id="outages" label="Outages per month">
          <Input id="outages" type="number" min={0} inputMode="numeric" />
        </Field>
      </div>

      <FieldGroup label="Services offered">
        <div className="flex flex-wrap gap-3">
          {SERVICES.map((s) => (
            <CheckRow
              key={s}
              id={`svc-${s}`}
              label={s}
              checked={services.includes(s)}
              onChange={() => toggle(services, setServices, s)}
            />
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="Current energy sources">
        <div className="flex flex-wrap gap-3">
          {ENERGY_SOURCES.map((s) => (
            <CheckRow
              key={s}
              id={`src-${s}`}
              label={s}
              checked={sources.includes(s)}
              onChange={() => toggle(sources, setSources, s)}
            />
          ))}
        </div>
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="grid-bill" label="Monthly grid bill (TSh)">
          <Input id="grid-bill" type="number" min={0} inputMode="numeric" />
        </Field>
        <Field id="diesel-cost" label="Monthly diesel cost (TSh)">
          <Input id="diesel-cost" type="number" min={0} inputMode="numeric" />
        </Field>
        <Field id="fridge-count" label="Refrigerators (count)">
          <Input id="fridge-count" type="number" min={0} inputMode="numeric" />
        </Field>
        <Field id="fridge-age" label="Refrigerators (average age, years)">
          <Input id="fridge-age" type="number" min={0} inputMode="numeric" />
        </Field>
        <Field id="spoilage" label="Vaccine spoilage past 12 months (TSh, optional)">
          <Input id="spoilage" type="number" min={0} inputMode="numeric" />
        </Field>
        <Field id="afterhours" label="After-hours load observed?">
          <Select>
            <SelectTrigger id="afterhours">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field id="afterhours-note" label="After-hours observation note">
        <Textarea id="afterhours-note" rows={2} placeholder="What was running after hours?" />
      </Field>

      {/* Parameters 14 & 15 are auto-computed by the platform. */}
      <div className="grid gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Generator runtime ratio <span className="font-medium text-foreground">auto-computed</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Climate exposure <span className="font-medium text-foreground">auto from NASA POWER</span>
        </div>
      </div>

      <Button type="submit" className="min-h-11">
        <Save className="size-4" aria-hidden /> Save audit inputs
      </Button>
    </form>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-foreground">{label}</legend>
      {children}
    </fieldset>
  )
}

function CheckRow({
  id,
  label,
  checked,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  )
}
