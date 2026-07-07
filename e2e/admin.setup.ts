import { test as setup } from '@playwright/test'
import path from 'node:path'
import { login } from './login-helper'

setup('authenticate as admin', async ({ page }) => {
  setup.setTimeout(180_000)
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD
  setup.skip(!email || !password, 'E2E_ADMIN_EMAIL/PASSWORD not set in e2e/.env.test')
  await login(page, email!, password!, path.resolve(__dirname, '.auth/admin.json'))
})
