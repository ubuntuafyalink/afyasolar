"use client"

import { useMemo } from "react"
import { useAdminFacilitiesComprehensive } from "@/hooks/use-admin-facilities-comprehensive"
import { useAdminPortfolioAssessments } from "@/hooks/use-admin-portfolio-assessments"
import { useAdminPortfolioClimate } from "@/hooks/use-admin-portfolio-climate"
import { buildPortfolioFacilities } from "@/lib/dashboard/admin-portfolio-real"
import type { PortfolioFacility } from "@/lib/dashboard/admin-portfolio-types"

export type UseAdminPortfolioResult = {
  facilities: PortfolioFacility[]
  /** Primary list state (facilities + assessments). */
  isLoading: boolean
  isError: boolean
  /** Heavier, optional NASA climate layer - surfaced separately so sections
   *  can render assessment data while hazard exposure is still resolving. */
  climateLoading: boolean
  climateError: boolean
  refetch: () => void
}

/**
 * The real admin portfolio: joins comprehensive facilities + latest assessment
 * snapshots + NASA climate exposure into PortfolioFacility[] keyed on the real
 * facility id. Pure aggregations live in admin-portfolio-real.ts; call them with
 * useMemo in the consuming section.
 */
export function useAdminPortfolio(): UseAdminPortfolioResult {
  const facilitiesQ = useAdminFacilitiesComprehensive()
  const assessmentsQ = useAdminPortfolioAssessments()
  const climateQ = useAdminPortfolioClimate()

  const facilities = useMemo(
    () => buildPortfolioFacilities(facilitiesQ.data, assessmentsQ.data, climateQ.data?.rows),
    [facilitiesQ.data, assessmentsQ.data, climateQ.data],
  )

  return {
    facilities,
    isLoading: facilitiesQ.isLoading || assessmentsQ.isLoading,
    isError: facilitiesQ.isError || assessmentsQ.isError,
    climateLoading: climateQ.isLoading,
    climateError: climateQ.isError,
    refetch: () => {
      facilitiesQ.refetch()
      assessmentsQ.refetch()
      climateQ.refetch()
    },
  }
}
