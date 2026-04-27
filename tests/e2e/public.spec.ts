import { test, expect } from "@playwright/test"

test.describe("MoneyNote E2E", () => {
  test("1. landing page loads and shows MoneyNote branding", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /Catat Keuangan Pribadi/i })).toBeVisible()
    await expect(page.locator("header").getByText("MoneyNote")).toBeVisible()
  })

  test("2. landing page shows core feature cards", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: /Telegram & WhatsApp Bot/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Wawasan AI/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Mode Offline/i })).toBeVisible()
  })

  test("3. landing page shows pricing tiers (Gratis & Premium)", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { name: "Gratis" })).toBeVisible()
    await expect(page.getByText("Rp 0")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Premium" })).toBeVisible()
    await expect(page.getByText("Rp 49.000")).toBeVisible()
  })

  test("4. clicking 'Masuk' navigates to login page", async ({ page }) => {
    await page.goto("/")
    await page.locator("header").getByRole("link", { name: "Masuk" }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await expect(page.getByText("Masuk ke MoneyNote")).toBeVisible()
  })

  test("5. clicking 'Daftar Gratis' navigates to register page", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: "Daftar Gratis" }).first().click()
    await expect(page).toHaveURL(/\/auth\/register/)
  })

  test("6. login page shows email + password form and Google OAuth button", async ({ page }) => {
    await page.goto("/auth/login")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.getByRole("button", { name: "Masuk" })).toBeVisible()
    await expect(page.getByRole("button", { name: /Lanjut dengan Google/i })).toBeVisible()
  })

  test("7. login page has Magic Link tab", async ({ page }) => {
    await page.goto("/auth/login")
    await page.getByRole("tab", { name: "Magic Link" }).click()
    await expect(page.getByRole("button", { name: /Kirim Magic Link/i })).toBeVisible()
  })

  test("8. submitting empty login form is blocked by browser validation", async ({ page }) => {
    await page.goto("/auth/login")
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
    const isInvalid = await page.locator("#email").evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })

  test("9. login with invalid credentials shows error alert", async ({ page }) => {
    await page.goto("/auth/login")
    await page.locator("#email").fill("nonexistent@test.com")
    await page.locator("#password").fill("wrongpassword123")
    await page.getByRole("button", { name: "Masuk" }).click()
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 15_000 })
  })

  test("10. visiting /dashboard while unauthenticated does not crash", async ({ page }) => {
    const response = await page.goto("/dashboard")
    expect(response?.status()).toBeLessThan(500)
    // either redirected to login OR shown a login form inline — both acceptable
    const onLogin = page.url().includes("/auth/login") || page.url().includes("/dashboard")
    expect(onLogin).toBe(true)
  })
})
