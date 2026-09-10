/**
 * Who may reach the management panel.
 *
 * This was previously a company email string copied into seven files, which
 * meant two things: changing it required finding every copy, and anyone
 * self-hosting this MIT-licensed platform could not use the panel at all
 * without editing source. Both are fixed by reading it from the environment,
 * with the existing address as the default so behaviour is unchanged.
 */

const DEFAULT_MANAGEMENT_PANEL_EMAIL = 'services@ubuntuafyalink.co.tz'

export function managementPanelEmail(): string {
  // NEXT_PUBLIC_ is read by the sign-in page, which is a client component and
  // cannot see server-only variables. Set both to the same value, or neither.
  return (
    process.env.MANAGEMENT_PANEL_EMAIL ||
    process.env.NEXT_PUBLIC_MANAGEMENT_PANEL_EMAIL ||
    DEFAULT_MANAGEMENT_PANEL_EMAIL
  ).toLowerCase()
}

/** True when the signed-in address is the management-panel account. */
export function isManagementPanelUser(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase() === managementPanelEmail()
}
