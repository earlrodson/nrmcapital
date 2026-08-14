import { test, expect } from "@playwright/test"
import postgres from "postgres"
import { randomUUID } from "node:crypto"

import { hashPassword } from "../lib/auth/password"

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres")

const testUserId = `e2e-dash-user-${randomUUID()}`
const testClientId = `e2e-dash-client-${randomUUID()}`
const testLoanId = `e2e-dash-loan-${randomUUID()}`
const testPaymentId = `e2e-dash-payment-${randomUUID()}`
const testPassword = "e2e-test-password-123"
let clientNumber = ""
let adminUserId = ""

test.describe("Client dashboard", () => {
  test.beforeAll(async () => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for DB-backed client dashboard tests.")

    const [admin] = await sql<{ id: string }[]>`
      select id from users where role in ('ADMIN', 'SUPERADMIN') limit 1
    `
    adminUserId = admin!.id

    const [client] = await sql<{ id: string; client_number: string }[]>`
      insert into clients (id, first_name, last_name, is_active, created_at, updated_at)
      values (${testClientId}, 'E2E', 'Dashboard Test', true, now(), now())
      returning id, client_number
    `
    clientNumber = client!.client_number

    await sql`
      insert into users (id, email, password_hash, name, role, created_at, updated_at)
      values (${testUserId}, ${clientNumber}, ${hashPassword(testPassword)}, 'E2E Dashboard Test', 'CLIENT', now(), now())
    `
    await sql`update clients set user_id = ${testUserId} where id = ${testClientId}`

    await sql`
      insert into loans (
        id, client_id, loan_type, principal_amount, monthly_interest_rate, months, terms_per_month,
        total_terms, payment_frequency, estimated_interest, total_interest, total_payable,
        amortization_amount, loan_date, expected_end_date, status, outstanding_balance, total_paid, created_by_id,
        updated_at
      ) values (
        ${testLoanId}, ${testClientId}, 'FLAT', 10000.00, 5.00, 10, 1,
        10, 'MONTHLY', 5000.00, 5000.00, 15000.00,
        1500.00, now(), now() + interval '10 months', 'ACTIVE', 10500.00, 4500.00, ${adminUserId}, now()
      )
    `

    await sql`
      insert into payments (id, loan_id, amount, payment_type, payment_method, payment_date, recorded_by_id)
      values (${testPaymentId}, ${testLoanId}, 1500.00, 'REGULAR', 'CASH', now(), ${adminUserId})
    `
  })

  test.afterAll(async () => {
    if (!process.env.DATABASE_URL) return
    await sql`delete from payments where id = ${testPaymentId}`
    await sql`delete from loans where id = ${testLoanId}`
    await sql`update clients set user_id = null where id = ${testClientId}`
    await sql`delete from users where id = ${testUserId}`
    await sql`delete from clients where id = ${testClientId}`
    await sql.end()
  })

  async function loginAsClient(page: import("@playwright/test").Page) {
    await page.goto("/login")
    await page.fill("#identifier", clientNumber)
    await page.fill("#password", testPassword)
    await Promise.all([
      page.waitForURL("**/client/dashboard", { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ])
  }

  test("client can log in by client number and see loan balance, progress, and last payment", async ({ page }) => {
    await loginAsClient(page)

    await expect(page.locator("h1")).toContainText("E2E Dashboard Test")

    const card = page.locator("text=Current Balance").locator("..").locator("..")
    await expect(card).toContainText("10,500")
    await expect(card).toContainText("30%")
  })

  for (const width of [320, 375, 768]) {
    test(`dashboard has no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await loginAsClient(page)
      await expect(page.locator("text=Current Balance").first()).toBeVisible()

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })
  }
})
