import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({ db: {} }))

import { loans, clients } from "@/drizzle/schema"
import { reconcileLoanAndClientStatus } from "./loan-status.repository"

type Row = Record<string, unknown>

/**
 * Mimics drizzle's chainable query builder: `.select().from().where()` is
 * itself awaitable (resolves to all matching rows) and also exposes
 * `.limit(n)` for single-row lookups. Rows are served from a queue in the
 * exact order the function under test issues its selects.
 */
function createExecutor(selectQueue: Row[][]) {
  const updates: { table: unknown; values: Row }[] = []

  const executor = {
    select: () => ({
      from: () => ({
        where: () => {
          const rows = selectQueue.shift() ?? []
          return {
            limit: (_n: number) => Promise.resolve(rows.slice(0, _n)),
            then: (resolve: (value: Row[]) => void) => resolve(rows),
          }
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (values: Row) => {
        updates.push({ table, values })
        return { where: () => Promise.resolve() }
      },
    }),
  }

  return { executor, updates }
}

describe("reconcileLoanAndClientStatus", () => {
  it("does nothing when the loan cannot be found", async () => {
    const { executor, updates } = createExecutor([[]])

    await reconcileLoanAndClientStatus("missing-loan", executor as never)

    expect(updates).toHaveLength(0)
  })

  it("completes an ACTIVE loan at zero balance and deactivates the client when no other loans are active", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "ACTIVE", outstandingBalance: "0.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [{ isActive: true, deletedAt: null }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([
      { table: loans, values: expect.objectContaining({ status: "COMPLETED" }) },
      { table: clients, values: expect.objectContaining({ isActive: false }) },
    ])
  })

  it("keeps the client active when another loan for that client is still ACTIVE", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "ACTIVE", outstandingBalance: "0.00", clientId: "client-1" }],
      [{ status: "ACTIVE" }],
      [{ isActive: true, deletedAt: null }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([{ table: loans, values: expect.objectContaining({ status: "COMPLETED" }) }])
  })

  it("reverts a COMPLETED loan back to ACTIVE when a balance edit pushes it above zero", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "COMPLETED", outstandingBalance: "500.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [{ isActive: false, deletedAt: null }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([
      { table: loans, values: expect.objectContaining({ status: "ACTIVE" }) },
      { table: clients, values: expect.objectContaining({ isActive: true }) },
    ])
  })

  it("does not reactivate a client that was explicitly deactivated (deletedAt set)", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "COMPLETED", outstandingBalance: "500.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [{ isActive: false, deletedAt: new Date("2026-01-01") }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([{ table: loans, values: expect.objectContaining({ status: "ACTIVE" }) }])
  })

  it("leaves a DEFAULTED loan's status untouched even at zero balance", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "DEFAULTED", outstandingBalance: "0.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [{ isActive: true, deletedAt: null }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([{ table: clients, values: expect.objectContaining({ isActive: false }) }])
  })

  it("does not touch loan or client status when balance is positive and loan stays ACTIVE", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "ACTIVE", outstandingBalance: "1000.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [{ isActive: true, deletedAt: null }],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toHaveLength(0)
  })

  it("does nothing further when the client record cannot be found", async () => {
    const { executor, updates } = createExecutor([
      [{ id: "loan-1", status: "ACTIVE", outstandingBalance: "0.00", clientId: "client-1" }],
      [{ status: "COMPLETED" }],
      [],
    ])

    await reconcileLoanAndClientStatus("loan-1", executor as never)

    expect(updates).toEqual([{ table: loans, values: expect.objectContaining({ status: "COMPLETED" }) }])
  })
})
