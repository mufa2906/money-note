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

// The toast title is rendered both in the visible div AND in an
// aria-live screen-reader announcement, so scope to the toast viewport
// (rendered as the "Notifications" region by Radix) to avoid strict-mode
// violations.
function visibleToastTitle(page: Page, title: string) {
  return page.getByRole("region", { name: /Notifications/i }).getByText(title, { exact: true })
}

test.describe("Upgrade page — checkout return flow", () => {
  test("?status=success polls and shows a single success toast once user is premium", async ({ page }) => {
    // /api/user returns 'free' on first call, then 'premium' on subsequent calls (simulating webhook arriving)
    await stubUserTier(page, "free", { switchAfter: 1 })

    await page.goto("/dashboard/upgrade?status=success")

    const successToast = visibleToastTitle(page, "Pembayaran berhasil")
    await expect(successToast).toBeVisible({ timeout: 20_000 })

    // Premium badge confirms the user actually became premium
    await expect(page.getByText("Kamu sudah Premium!")).toBeVisible({ timeout: 5_000 })

    // No spam: even after a few seconds, only one matching visible toast in DOM
    await page.waitForTimeout(3_000)
    expect(await successToast.count()).toBeLessThanOrEqual(1)
  })

  test("?status=success times out gracefully when user never becomes premium", async ({ page }) => {
    test.setTimeout(60_000)
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade?status=success")

    const pendingToast = visibleToastTitle(page, "Pembayaran sedang dikonfirmasi")
    await expect(pendingToast).toBeVisible({ timeout: 30_000 })

    // Did not falsely promise success
    expect(await visibleToastTitle(page, "Pembayaran berhasil").count()).toBe(0)
  })

  test("?status=failed shows fail toast once and clears query", async ({ page }) => {
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade?status=failed")

    const failToast = visibleToastTitle(page, "Pembayaran gagal")
    await expect(failToast).toBeVisible({ timeout: 5_000 })

    await page.waitForTimeout(2_000)
    expect(await failToast.count()).toBeLessThanOrEqual(1)
  })

  test("upgrade page renders without ?status param without firing checkout toasts", async ({ page }) => {
    await stubUserTier(page, "free")

    await page.goto("/dashboard/upgrade")
    await expect(page.getByRole("heading", { name: /Upgrade ke Premium/i })).toBeVisible()

    // Neither toast should ever appear
    await page.waitForTimeout(1_500)
    expect(await visibleToastTitle(page, "Pembayaran berhasil").count()).toBe(0)
    expect(await visibleToastTitle(page, "Pembayaran gagal").count()).toBe(0)
    expect(await visibleToastTitle(page, "Pembayaran sedang dikonfirmasi").count()).toBe(0)
  })
})
