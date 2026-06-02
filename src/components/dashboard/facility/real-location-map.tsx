"use client"

import { ExternalLink, MapPin } from "lucide-react"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { FOCUS_RING } from "@/lib/dashboard/facility-ui"
import { useT } from "./facility-preferences-provider"

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

/**
 * Real interactive location map. When NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set we
 * use the free Google Maps Embed API (marker + Street View). Otherwise we fall
 * back to a key-free OpenStreetMap embed with a pin. Iframes lazy-load and
 * degrade to coordinates + an "Open in Google Maps" link when offline.
 */
export function RealLocationMap({
  lat,
  lon,
  label,
  className,
}: {
  lat: number
  lon: number
  label?: string | null
  className?: string
}) {
  const t = useT()
  const coordText = `${lat.toFixed(4)}, ${lon.toFixed(4)}`
  const openInMaps = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`

  const delta = 0.08
  const osmSrc =
    `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}` +
    `&layer=mapnik&marker=${lat}%2C${lon}`
  const googlePlace = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_KEY}&q=${lat},${lon}&zoom=11`
  const googleStreet = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_KEY}&location=${lat},${lon}&heading=210&pitch=10&fov=90`

  return (
    <div className={cn("space-y-2", className)}>
      {GOOGLE_KEY ? (
        <Tabs defaultValue="map">
          <TabsList>
            <TabsTrigger value="map">{t("climateOutlook.mapTab")}</TabsTrigger>
            <TabsTrigger value="street">{t("climateOutlook.streetTab")}</TabsTrigger>
          </TabsList>
          <TabsContent value="map">
            <iframe
              title={t("climateOutlook.mapTab")}
              src={googlePlace}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full rounded-lg border border-border"
              allowFullScreen
            />
          </TabsContent>
          <TabsContent value="street">
            <iframe
              title={t("climateOutlook.streetTab")}
              src={googleStreet}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full rounded-lg border border-border"
              allowFullScreen
            />
          </TabsContent>
        </Tabs>
      ) : (
        <iframe
          title={t("climateOutlook.mapTab")}
          src={osmSrc}
          loading="lazy"
          className="h-72 w-full rounded-lg border border-border"
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5" aria-hidden />
          {label ? `${label} (${coordText})` : coordText}
        </span>
        <a
          href={openInMaps}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("inline-flex items-center gap-1 font-medium text-foreground underline", FOCUS_RING)}
        >
          {t("climateOutlook.openInMaps")}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </div>
    </div>
  )
}
