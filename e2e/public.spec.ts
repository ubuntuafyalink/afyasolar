import { test, expect, type Page } from '@playwright/test'

/** Collect uncaught page exceptions (real bugs), ignoring noisy console warnings. */
function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

test.describe('public pages render without crashing', () => {
  test('sign-in shows the premium form', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/auth/signin')
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel('Email address')).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /^sign in$/i })).toBeVisible()
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('sign-up loads step 1', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/auth/signup')
    await expect(page.getByText(/account/i).first()).toBeVisible()
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('forgot-password loads', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/auth/forgot-password')
    // The title is a shadcn CardTitle (<div>), not a semantic heading — match text.
    await expect(page.getByText(/forgot password/i).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('body')).toBeVisible()
  })

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy-policy')
    await expect(page.locator('body')).toBeVisible()
  })

  test('self-hosted JetBrains Mono font is served (200, not auth-gated)', async ({ request }) => {
    const res = await request.get('/fonts/jetbrains-mono-variable-latin.woff2')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type'] ?? '').toContain('font')
  })
})
