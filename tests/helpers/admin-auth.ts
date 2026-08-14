import { expect, type Page } from "@playwright/test"

export async function loginAsAdmin(page: Page) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nrmcapital.com"
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!ChangeMe"

  await page.goto("/login")
  await page.fill("#identifier", adminEmail)
  await page.fill("#password", adminPassword)
  const loginResponsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
    { timeout: 15000 },
  )
  await page.getByRole("button", { name: "Sign in" }).click()

  const loginResponse = await loginResponsePromise
  if (!loginResponse.ok()) {
    const payload = (await loginResponse.json().catch(() => null)) as { error?: { message?: string } } | null
    const message = payload?.error?.message ?? `HTTP ${loginResponse.status()}`
    throw new Error(`Admin login request failed during E2E setup: ${message}`)
  }

  await page.goto("/admin/dashboard")
  await expect(page).toHaveURL("/admin/dashboard", { timeout: 10000 })
}
