import { type Page } from '@playwright/test'

export async function hasSessionCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies()
  return cookies.some((c) => /(next-auth|authjs)\.session-token/.test(c.name))
}

/**
 * Log in via the credentials form and save the authenticated storageState.
 * Success is signalled by the auth session cookie (robust against the sign-in
 * page's setTimeout redirect). Retries a few times to ride over the dev DB's
 * intermittent connection resets (missing TiDB CA cert → insecure connection).
 */
export async function login(page: Page, email: string, password: string, stateFile: string) {
  if (password.length < 10) {
    throw new Error(
      `Password for ${email} looks truncated (length ${password.length}). ` +
        `Check e2e/.env.test quoting (a '#' in an unquoted value is treated as a comment).`,
    )
  }
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await page.goto('/auth/signin')
    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    for (let i = 0; i < 20; i++) {
      if (await hasSessionCookie(page)) {
        await page.context().storageState({ path: stateFile })
        return
      }
      await page.waitForTimeout(1_000)
    }
  }
  throw new Error(
    `Login failed for ${email} after ${MAX_ATTEMPTS} attempts. Likely causes: ` +
      `401 = wrong credentials/account state; or the dev TiDB connection is unstable ` +
      `(ECONNRESET / "CA certificate not found (certs/isgrootx1.pem)").`,
  )
}
