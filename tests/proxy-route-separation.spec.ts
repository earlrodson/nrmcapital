import { test, expect } from "@playwright/test"
import postgres from "postgres"
import { randomUUID } from "node:crypto"

import { hashPassword } from "../lib/auth/password"
import { loginAsAdmin } from "./helpers/admin-auth"

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres")

const testUserId = `e2e-proxy-client-${randomUUID()}`
const testClientId = `e2e-proxy-client-${randomUUID()}`
const testPassword = "e2e-test-password-123"

test.describe("proxy.ts route separation", () => {
  test.beforeAll(async () => {
    await sql`
      insert into clients (id, first_name, last_name, is_active, created_at, updated_at)
      values (${testClientId}, 'E2E', 'Proxy Test', true, now(), now())
    `
    await sql`
      insert into users (id, email, password_hash, name, role, created_at, updated_at)
      values (${testUserId}, ${testClientId}, ${hashPassword(testPassword)}, 'E2E Proxy Test', 'CLIENT', now(), now())
    `
    await sql`update clients set user_id = ${testUserId} where id = ${testClientId}`
  })

  test.afterAll(async () => {
    await sql`update clients set user_id = null where id = ${testClientId}`
    await sql`delete from users where id = ${testUserId}`
    await sql`delete from clients where id = ${testClientId}`
    await sql.end()
  })

  test("unauthenticated request to /client/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/client/dashboard")
    await expect(page).toHaveURL("/login")
  })

  test("unauthenticated request to /admin/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL("/login")
  })

  test("CLIENT session hitting /admin/** redirects to /client/dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.fill("#identifier", testClientId)
    await page.fill("#password", testPassword)
    await Promise.all([
      page.waitForURL("**/client/dashboard", { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ])

    await page.goto("/admin/dashboard")
    await expect(page).toHaveURL("/client/dashboard")
  })

  test("ADMIN session hitting /client/** redirects to /admin/dashboard", async ({ page }) => {
    await loginAsAdmin(page)

    await page.goto("/client/dashboard")
    await expect(page).toHaveURL("/admin/dashboard")
  })
})
