import { FacilityPreferencesProvider } from "@/components/dashboard/facility/facility-preferences-provider"
import { DistrictDashboard } from "@/components/district/district-dashboard"

/**
 * District Health Office dashboard (frontend + simulated data).
 *
 * Rendered directly without a role gate, mirroring the NGO and design-admin
 * routes, so it is reachable in the frontend-only simulation without adding a
 * new auth role. Production would introduce a `district` role and gate this page
 * like the facility/investor dashboards. Wrapped in FacilityPreferencesProvider
 * to reuse the bilingual (EN/SW) + accessibility layer and the header toolbar.
 */
export default function DistrictDashboardPage() {
  return (
    <FacilityPreferencesProvider>
      <DistrictDashboard />
    </FacilityPreferencesProvider>
  )
}
