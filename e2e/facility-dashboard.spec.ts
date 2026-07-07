import { test, expect, type Page } from '@playwright/test'

function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

test.describe('facility dashboard', () => {
  test('loads without a client crash', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/dashboard/facility')
    // Resilient smoke: the shell should render (not a blank/error screen).
    await expect(page.locator('body')).toBeVisible()
    await page.waitForTimeout(1500)
    expect(errors, errors.join('\n')).toHaveLength(0)
  })
})
