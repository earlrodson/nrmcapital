import { expect, test } from "@playwright/test"

import { loginAsAdmin } from "./helpers/admin-auth"
import { getAnyActiveLoanId, getPaymentByNotes, getPaymentEvents } from "./helpers/db"

test.describe("Loan detail payment editing", () => {
  test("updates payment and records UPDATED payment event snapshot", async ({ page }) => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for DB assertions.")
    const loanId = await getAnyActiveLoanId()
    test.skip(!loanId, "Requires at least one active loan in seeded database.")

    const marker = `e2e-edit-${Date.now()}`
    await loginAsAdmin(page)

    await page.goto(`/admin/payments/new?loanId=${loanId}`)
    await page.fill("#amount", "222.00")
    await page.fill("#notes", marker)
    await page.click('button:has-text("Record Payment")')
    await expect(page.locator("text=Payment recorded successfully")).toBeVisible()

    await page.goto(`/admin/loans/${loanId}`)
    const row = page.locator("tr", { hasText: marker }).first()
    await expect(row).toBeVisible()
    await row.locator('button:has-text("Edit")').click()

    const updatedNote = `${marker}-updated`
    await page.fill("#editAmount", "333.00")
    await page.fill("#editNotes", updatedNote)
    await page.click('button:has-text("Save Changes")')
    await expect(page.locator("tr", { hasText: updatedNote })).toBeVisible()

    const payment = await getPaymentByNotes(updatedNote)
    expect(payment).not.toBeNull()
    expect(payment?.deleted_at).toBeNull()
    expect(payment?.amount).toBe("333.00")

    const events = await getPaymentEvents(payment!.id)
    expect(events.map((event) => event.eventType)).toEqual(expect.arrayContaining(["CREATED", "UPDATED"]))

    const updatedEvent = events.find((event) => event.eventType === "UPDATED")
    expect(updatedEvent?.before?.notes).toBe(marker)
    expect(updatedEvent?.after?.notes).toBe(updatedNote)
    expect(updatedEvent?.before?.amount).toBe("222.00")
    expect(updatedEvent?.after?.amount).toBe("333.00")
  })
})
