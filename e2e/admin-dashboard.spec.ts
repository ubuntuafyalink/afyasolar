import { test, expect, type Page } from '@playwright/test'

// In-place sidebar sections (exclude Overview/Facilities/Users which navigate to
// their own routes). These render inside the dashboard shell via activeSection.
const IN_PLACE_SECTIONS = [
  'Maternal & Newborn',
  'Resilience Score',
  'Climate Outlook',
  'Power',
  'Energy Efficiency',
  'Reports',
  'Notifications',
  'Assistant',
  'Channels',
  'Bills & Payment',
  'Carbon Credits',
  'Subscription',
  'Packages',
  'Help',
  'Technicians',
  'Settings',
]

function trackPageErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  return errors
}

test.describe('admin dashboard', () => {
  test('overview renders KPIs and header', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/dashboard/admin/overview')
    await expect(page.getByRole('heading', { name: 'System overview' })).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('Facilities').first()).toBeVisible()
    await expect(page.getByText('Climate conditions today')).toBeVisible()
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('every in-place sidebar section renders without a client crash', async ({ page }) => {
    const errors = trackPageErrors(page)
    await page.goto('/dashboard/admin/overview')
    await expect(page.getByRole('heading', { name: 'System overview' })).toBeVisible({ timeout: 60_000 })

    const failures: string[] = []
    for (const label of IN_PLACE_SECTIONS) {
      const btn = page.getByRole('button', { name: label, exact: true })
      if ((await btn.count()) === 0) {
        failures.push(`sidebar item not found: ${label}`)
        continue
      }
      await btn.first().click()
      // Section content swaps in; give it a moment to fetch/render, then assert
      // the main content region is still present (i.e. no crash / white screen).
      await page.waitForTimeout(600)
      await expect(page.locator('main')).toBeVisible()
    }
    expect(failures, failures.join('\n')).toHaveLength(0)
    expect(errors, errors.join('\n')).toHaveLength(0)
  })

  test('power section opens a facility drill-down dialog', async ({ page }) => {
    await page.goto('/dashboard/admin/overview')
    await page.getByRole('button', { name: 'Power', exact: true }).click()
    await page.waitForTimeout(800)
    const view = page.getByRole('button', { name: /^view$/i }).first()
    if ((await view.count()) > 0) {
      await view.click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toBeHidden()
    } else {
      test.info().annotations.push({ type: 'note', description: 'No facilities in Power table to drill into (empty data).' })
    }
  })
})
