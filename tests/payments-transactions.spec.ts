import { expect, test } from "@playwright/test"

import { loginAsAdmin } from "./helpers/admin-auth"
import { getAnyActiveLoanId, getLatestAuditLogForPayment, getPaymentByNotes, getPaymentEvents } from "./helpers/db"

test.describe("Payments transactions soft delete", () => {
  test("removes payment via UI but keeps history artifacts", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for DB assertions.")
    const loanId = await getAnyActiveLoanId()
    test.skip(!loanId, "Requires at least one active loan in seeded database.")

    const marker = `e2e-remove-${Date.now()}`
    await loginAsAdmin(page)

    await page.goto(`/admin/payments/new?loanId=${loanId}`)
    await page.fill("#amount", "123.45")
    await page.fill("#notes", marker)
    await page.click('button:has-text("Record Payment")')
    await expect(page.locator("text=Payment recorded successfully")).toBeVisible()

    await page.goto("/admin/payments")
    const targetRow = page.locator("tr", { hasText: marker }).first()
    await expect(targetRow).toBeVisible()
    await targetRow.locator('button:has-text("Remove")').click()

    const reason = `Wrong account ${marker}`
    await page.fill("#removePaymentReason", reason)
    await page.click('button:has-text("Remove Payment")')

    await expect(page.locator("tr", { hasText: marker })).toHaveCount(0)

    const payment = await getPaymentByNotes(marker)
    expect(payment).not.toBeNull()
    expect(payment?.deleted_at).not.toBeNull()
    expect(payment?.delete_reason).toBe(reason)

    const events = await getPaymentEvents(payment!.id)
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(["CREATED", "SOFT_DELETED"]))

    const deletedEvent = events.find((event) => event.eventType === "SOFT_DELETED")
    expect(deletedEvent?.before?.paymentId).toBe(payment?.id)
    expect(deletedEvent?.after?.deleteReason).toBe(reason)
    expect(deletedEvent?.after?.deletedAt).toBeTruthy()

    const audit = await getLatestAuditLogForPayment(payment!.id, "DELETE")
    expect(audit).not.toBeNull()
    expect(audit?.user_id).toBeTruthy()
    const payload = (audit?.payload ?? {}) as Record<string, unknown>
    expect(payload.reason).toBe(reason)
    expect(payload.deletedPayment).toBeTruthy()
  })
})
