import { test, expect } from "@playwright/test"
import postgres from "postgres"
import { randomUUID } from "node:crypto"

import { loginAsAdmin } from "./helpers/admin-auth"

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres")

const testClientId = `e2e-portal-client-${randomUUID()}`

test.describe("Admin portal provisioning", () => {
  test.beforeAll(async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for portal provisioning DB assertions.")
    await sql`
      insert into clients (id, first_name, last_name, is_active, created_at, updated_at)
      values (${testClientId}, 'E2E', 'Portal Provision Test', true, now(), now())
    `
  })

  test.afterAll(async () => {
    if (!process.env.DATABASE_URL) return
    const [client] = await sql<{ user_id: string | null }[]>`select user_id from clients where id = ${testClientId}`
    await sql`update clients set user_id = null where id = ${testClientId}`
    if (client?.user_id) await sql`delete from users where id = ${client.user_id}`
    await sql`delete from clients where id = ${testClientId}`
    await sql.end()
  })

  test("create portal access, log in as that client, then reset the password and confirm the old one stops working", async ({
    page,
  }) => {
    await loginAsAdmin(page)
    await page.goto(`/admin/clients/${testClientId}`)

    await expect(page.getByRole("button", { name: "Create Portal Access" })).toBeVisible()
    await page.getByRole("button", { name: "Create Portal Access" }).click()

    await expect(page.getByText("Client Portal Credentials")).toBeVisible()
    const loginId = await page.locator("#portal-login-id").inputValue()
    const firstPassword = await page.locator("#portal-password").inputValue()
    expect(loginId).toMatch(/^CL-\d+$/)
    expect(firstPassword.length).toBeGreaterThan(0)

    const [row] = await sql<{ action: string }[]>`
      select action from audit_logs where entity = 'CLIENT' and entity_id = ${testClientId} and action = 'CREATE_PORTAL_ACCESS'
    `
    expect(row?.action).toBe("CREATE_PORTAL_ACCESS")

    await page.getByRole("button", { name: "Done" }).click()
    await expect(page.getByRole("button", { name: "Reset Portal Password" })).toBeVisible()

    await page.click("button.relative.h-8.w-8.rounded-full")
    await page.click("text=Log out")
    await expect(page).toHaveURL("/login")

    await page.fill("#identifier", loginId)
    await page.fill("#password", firstPassword)
    await Promise.all([
      page.waitForURL("**/client/dashboard", { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ])
    await expect(page).toHaveURL("/client/dashboard")

    // Back to admin, reset the password.
    await loginAsAdmin(page)
    await page.goto(`/admin/clients/${testClientId}`)
    await page.getByRole("button", { name: "Reset Portal Password" }).click()
    await expect(page.getByText("Client Portal Credentials")).toBeVisible()
    const secondPassword = await page.locator("#portal-password").inputValue()
    expect(secondPassword).not.toBe(firstPassword)
    await page.getByRole("button", { name: "Done" }).click()

    const [resetRow] = await sql<{ action: string }[]>`
      select action from audit_logs where entity = 'CLIENT' and entity_id = ${testClientId} and action = 'RESET_PORTAL_PASSWORD'
    `
    expect(resetRow?.action).toBe("RESET_PORTAL_PASSWORD")

    // Old password no longer works.
    await page.click("button.relative.h-8.w-8.rounded-full")
    await page.click("text=Log out")
    await expect(page).toHaveURL("/login")

    await page.fill("#identifier", loginId)
    await page.fill("#password", firstPassword)
    const failedResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/api/auth/login") && response.request().method() === "POST",
    )
    await page.click('button[type="submit"]')
    const failedResponse = await failedResponsePromise
    expect(failedResponse.ok()).toBe(false)

    // New password works.
    await page.fill("#password", secondPassword)
    await Promise.all([
      page.waitForURL("**/client/dashboard", { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ])
    await expect(page).toHaveURL("/client/dashboard")
  })
})
