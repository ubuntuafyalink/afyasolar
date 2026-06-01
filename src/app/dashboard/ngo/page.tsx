import { FacilityPreferencesProvider } from "@/components/dashboard/facility/facility-preferences-provider"
import { NgoPortfolioDashboard } from "@/components/ngo/ngo-portfolio-dashboard"

/**
 * NGO / faith-based PORTFOLIO dashboard (frontend + simulated data).
 *
 * Rendered directly without a role gate, mirroring the existing `design-admin`
 * route, so it is reachable in the frontend-only simulation without adding a new
 * auth role or touching the database. Production would introduce an `ngo` role
 * and gate this page the way the facility/investor dashboards are gated.
 *
 * Wrapped in FacilityPreferencesProvider to reuse the bilingual (EN/SW) +
 * accessibility layer and the shared header toolbar.
 */
export default function NgoDashboardPage() {
  return (
    <FacilityPreferencesProvider>
      <NgoPortfolioDashboard />
    </FacilityPreferencesProvider>
  )
}
