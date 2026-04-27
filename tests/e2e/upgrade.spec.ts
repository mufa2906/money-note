import { test, expect, type Page } from "@playwright/test"

// Stub /api/user so the upgrade page sees a deterministic subscription tier.
async function stubUserTier(page: Page, tier: "free" | "premium", opts?: { switchAfter?: number }) {
  let calls = 0
  await page.route("**/api/user", async (route, request) => {
    if (request.method() !== "GET") return route.continue()
    calls += 1
    const effective = opts?.switchAfter && calls > opts.switchAfter ? "premium" : tier
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user",
        name: "Playwright Test",
        email: "playwright-test@money-note.test",
        subscriptionTier: effective,
      }),
    })
  })
}

test.describe("Upgrade page — checkout return flow", () => {
  test("?status=success polls and shows a single success toast once user is premium", async ({ page }) => {
    // /api/user returns 'free' on first call, then 'premium' on subsequent calls (simulating webhook arriving)
    await stubUserTier(page, "free", { switchAfter: 1 })

    await page.goto("/dashboard/upgrade?status=success")

    // URL is stripped of ?status almost immediately
    await expect(page).toHaveURL(/\/dashboard\/upgrade$/, { timeout: 5_000 })

    // Success toast appears once
    const successToast = page.getByText("Pembayaran berhasil")
    await expect(successToast).toBeVisible({ timeout: 15_000 })

    // No spam: even after a few seconds, only one matching toast in DOM
    await page.waitForTimeout(3_000)
    expect(await page.getByText("Pembayaran berhasil").count()).toBeLessThanOrEqual(1)
  })

  test("?status=success times out gracefully when user never becomes premium", async ({ page }) => {
    test.setTimeout(60_000)
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade?status=success")
    await expect(page).toHaveURL(/\/dashboard\/upgrade$/, { timeout: 5_000 })

    // After ~10 polls × 2s, the pending toast appears
    await expect(page.getByText("Pembayaran sedang dikonfirmasi")).toBeVisible({ timeout: 30_000 })

    // Did not show the success toast
    expect(await page.getByText("Pembayaran berhasil").count()).toBe(0)
  })

  test("?status=failed shows fail toast and clears URL", async ({ page }) => {
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade?status=failed")

    await expect(page).toHaveURL(/\/dashboard\/upgrade$/, { timeout: 5_000 })
    await expect(page.getByText("Pembayaran gagal")).toBeVisible({ timeout: 5_000 })

    // No spam
    await page.waitForTimeout(2_000)
    expect(await page.getByText("Pembayaran gagal").count()).toBeLessThanOrEqual(1)
  })

  test("upgrade page renders without ?status param without firing checkout toasts", async ({ page }) => {
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade")
    await expect(page.getByRole("heading", { name: /Upgrade ke Premium/i })).toBeVisible()

    // Neither toast should ever appear
    await page.waitForTimeout(1_500)
    expect(await page.getByText("Pembayaran berhasil").count()).toBe(0)
    expect(await page.getByText("Pembayaran gagal").count()).toBe(0)
    expect(await page.getByText("Pembayaran sedang dikonfirmasi").count()).toBe(0)
  })
})
