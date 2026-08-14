import { describe, expect, it, vi, beforeEach } from "vitest"

type Row = Record<string, unknown>

vi.mock("@/lib/db/client", () => ({
  db: {
    transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
  },
}))

import { clients, users } from "@/drizzle/schema"

/**
 * Mimics the subset of drizzle's chainable update builder used by
 * `deactivateClient`: `.update(table).set(values).where(...)` is awaitable
 * directly (for the `users` cascade update) and also exposes `.returning()`
 * (for the `clients` update, whose row we need back).
 */
function makeUpdateChain(table: unknown, recordedUpdates: { table: string; values: Row }[], returningRows: Row[]) {
  return {
    update: (updatedTable: unknown) => ({
      set: (values: Row) => {
        const tableName = updatedTable === clients ? "clients" : updatedTable === users ? "users" : "unknown"
        recordedUpdates.push({ table: tableName, values })
        return {
          where: () => ({
            returning: () => Promise.resolve(tableName === "clients" ? returningRows : []),
            then: (resolve: (value: unknown) => void) => resolve(undefined),
          }),
        }
      },
    }),
  }.update(table)
}

let mockTx: { update: (table: unknown) => unknown }
let recordedUpdates: { table: string; values: Row }[]
let clientReturningRows: Row[]

beforeEach(() => {
  recordedUpdates = []
  clientReturningRows = []
  mockTx = {
    update: (table: unknown) => makeUpdateChain(table, recordedUpdates, clientReturningRows),
  }
})

describe("AdminRepository.deactivateClient", () => {
  it("cascades to the linked user's isActive when one exists", async () => {
    const { AdminRepository } = await import("./admin.repository")
    clientReturningRows = [{ id: "client-1", userId: "user-1", isActive: false }]

    const repo = new AdminRepository()
    const result = await repo.deactivateClient("client-1")

    expect(result).toEqual({ id: "client-1", userId: "user-1", isActive: false })
    expect(recordedUpdates).toHaveLength(2)
    expect(recordedUpdates[0].table).toBe("clients")
    expect(recordedUpdates[1]).toEqual({ table: "users", values: expect.objectContaining({ isActive: false }) })
  })

  it("is a no-op on users when the client has no linked user", async () => {
    const { AdminRepository } = await import("./admin.repository")
    clientReturningRows = [{ id: "client-2", userId: null, isActive: false }]

    const repo = new AdminRepository()
    const result = await repo.deactivateClient("client-2")

    expect(result).toEqual({ id: "client-2", userId: null, isActive: false })
    expect(recordedUpdates).toHaveLength(1)
    expect(recordedUpdates[0].table).toBe("clients")
  })

  it("returns null when the client doesn't exist, without touching users", async () => {
    const { AdminRepository } = await import("./admin.repository")
    clientReturningRows = []

    const repo = new AdminRepository()
    const result = await repo.deactivateClient("missing-client")

    expect(result).toBeNull()
    expect(recordedUpdates).toHaveLength(1)
    expect(recordedUpdates[0].table).toBe("clients")
  })
})
