import { test as setup, expect } from "@playwright/test"
import path from "path"

const authFile = path.join(__dirname, "../.auth/user.json")

const TEST_EMAIL = "playwright-test@money-note.test"
const TEST_PASSWORD = "PlaywrightTest123!"
const TEST_NAME = "Playwright Test"

setup.describe.configure({ timeout: 90_000 })

setup("register or login test user", async ({ page }) => {
  // Try logging in first — if the test user already exists this succeeds
  await page.goto("/auth/login")
  await page.locator("#email").fill(TEST_EMAIL)
  await page.locator("#password").fill(TEST_PASSWORD)
  await page.getByRole("button", { name: "Masuk" }).click()

  // Wait up to 10s for either /dashboard or to remain on /auth/login (failed login)
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
  } catch {
    // Login failed — register the user instead
    await page.goto("/auth/register")
    await page.locator("#name").fill(TEST_NAME)
    await page.locator("#email").fill(TEST_EMAIL)
    await page.locator("#password").fill(TEST_PASSWORD)
    await page.getByRole("button", { name: /Buat Akun Gratis/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  }

  await expect(page).toHaveURL(/\/dashboard/)

  // Persist authenticated cookies/storage for other tests
  await page.context().storageState({ path: authFile })
})
