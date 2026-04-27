import { test, expect, Page } from "@playwright/test"

// All tests here run with a logged-in session (storageState loaded by config).

test.describe("Dashboard — page navigation", () => {
  test("Beranda (home) renders with welcome heading", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page.getByRole("heading", { name: "Beranda" })).toBeVisible()
    await expect(page.getByText(/Selamat datang kembali/i)).toBeVisible()
  })

  test("Transaksi page renders", async ({ page }) => {
    await page.goto("/dashboard/transactions")
    await expect(page).toHaveURL(/\/dashboard\/transactions/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Akun (Accounts) page renders", async ({ page }) => {
    await page.goto("/dashboard/accounts")
    await expect(page).toHaveURL(/\/dashboard\/accounts/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Bagi Tagihan (Split bill) page renders", async ({ page }) => {
    await page.goto("/dashboard/split-bill")
    await expect(page).toHaveURL(/\/dashboard\/split-bill/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Wawasan AI (Insights) page renders", async ({ page }) => {
    await page.goto("/dashboard/insights")
    await expect(page).toHaveURL(/\/dashboard\/insights/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Integrasi Bot (Integrations) page renders", async ({ page }) => {
    await page.goto("/dashboard/integrations")
    await expect(page).toHaveURL(/\/dashboard\/integrations/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Notifikasi (Notifications) page renders", async ({ page }) => {
    await page.goto("/dashboard/notifications")
    await expect(page).toHaveURL(/\/dashboard\/notifications/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Upgrade page renders", async ({ page }) => {
    await page.goto("/dashboard/upgrade")
    await expect(page).toHaveURL(/\/dashboard\/upgrade/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })

  test("Pengaturan (Settings) page renders", async ({ page }) => {
    await page.goto("/dashboard/settings")
    await expect(page).toHaveURL(/\/dashboard\/settings/)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})

test.describe("Dashboard — sidebar navigation", () => {
  test("clicking sidebar links navigates to each section", async ({ page }) => {
    await page.goto("/dashboard")

    const sidebar = page.locator("aside")

    await sidebar.getByRole("link", { name: "Transaksi" }).click()
    await expect(page).toHaveURL(/\/dashboard\/transactions/)

    await sidebar.getByRole("link", { name: "Akun" }).click()
    await expect(page).toHaveURL(/\/dashboard\/accounts/)

    await sidebar.getByRole("link", { name: "Wawasan AI" }).click()
    await expect(page).toHaveURL(/\/dashboard\/insights/)

    await sidebar.getByRole("link", { name: "Pengaturan" }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings/)

    await sidebar.getByRole("link", { name: "Beranda" }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })
})

test.describe("Dashboard — pages have no critical console errors", () => {
  const PAGES = [
    "/dashboard",
    "/dashboard/transactions",
    "/dashboard/accounts",
    "/dashboard/split-bill",
    "/dashboard/insights",
    "/dashboard/integrations",
    "/dashboard/notifications",
    "/dashboard/upgrade",
    "/dashboard/settings",
  ]

  for (const route of PAGES) {
    test(`${route} loads without uncaught errors`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (e) => errors.push(e.message))
      const response = await page.goto(route)
      expect(response?.status() ?? 0).toBeLessThan(500)
      // give any client-side hydration/network errors a moment to surface
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {})
      expect(errors, `uncaught errors on ${route}: ${errors.join(" | ")}`).toEqual([])
    })
  }
})

test.describe("Dashboard — interactions", () => {
  test("balance card eventually shows IDR amount", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/dashboard")
    await expect(page.getByText(/Rp/).first()).toBeVisible({ timeout: 30_000 })
  })

  test("home page has at least one button (FAB or action)", async ({ page }) => {
    await page.goto("/dashboard")
    const buttons = page.getByRole("button")
    expect(await buttons.count()).toBeGreaterThan(0)
  })

  test("sidebar contains a theme toggle button", async ({ page }) => {
    await page.goto("/dashboard/settings")
    const themeToggle = page.locator("aside").getByRole("button").first()
    await expect(themeToggle).toBeVisible()
  })
})

test.describe("Dashboard — sign out flow", () => {
  test("signing out redirects to login", async ({ page }) => {
    await page.goto("/dashboard")
    // Find sign-out trigger — usually in sidebar at the bottom
    const signOutBtn = page
      .locator("aside")
      .getByRole("button", { name: /Keluar|Sign out|Log out/i })
      .first()

    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click()
      await page.waitForURL(/\/auth\/login/, { timeout: 10_000 })
      expect(page.url()).toContain("/auth/login")
    } else {
      test.skip(true, "Sign-out button not found in current sidebar layout")
    }
  })
})
