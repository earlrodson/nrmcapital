import { createHmac } from "node:crypto"

import { describe, expect, it, vi } from "vitest"

const queryResult: unknown[] = []

vi.mock("@/lib/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(queryResult),
        }),
      }),
    }),
  },
}))

import { getSessionUserFromToken } from "@/lib/auth/session"

function makeToken(userId: string) {
  const payload = { sid: "sid-1", userId, role: "CLIENT", exp: Date.now() + 60_000 }
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const secret = process.env.AUTH_SECRET ?? "nrm-dev-auth-secret"
  const signature = createHmac("sha256", secret).update(body).digest("hex")
  return `${body}.${signature}`
}

function setQueryResult(row: unknown) {
  queryResult.length = 0
  if (row) queryResult.push(row)
}

describe("getSessionUserFromToken", () => {
  it("returns null when the user no longer exists", async () => {
    setQueryResult(undefined)
    const result = await getSessionUserFromToken(makeToken("missing-user"))
    expect(result).toBeNull()
  })

  it("returns null for a deactivated ADMIN account", async () => {
    setQueryResult({ id: "u1", role: "ADMIN", email: "admin@nrm.com", name: "Admin", isActive: false })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toBeNull()
  })

  it("returns null for a deactivated SUPERADMIN account", async () => {
    setQueryResult({ id: "u1", role: "SUPERADMIN", email: "super@nrm.com", name: "Super", isActive: false })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toBeNull()
  })

  it("still returns a session for a deactivated CLIENT account (read-only history access)", async () => {
    setQueryResult({ id: "u1", role: "CLIENT", email: "CL-0002", name: "Earl Test", isActive: false })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toEqual({ userId: "u1", role: "CLIENT", email: "CL-0002", name: "Earl Test" })
  })

  it("returns a session for an active CLIENT account", async () => {
    setQueryResult({ id: "u1", role: "CLIENT", email: "CL-0002", name: "Earl Test", isActive: true })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toEqual({ userId: "u1", role: "CLIENT", email: "CL-0002", name: "Earl Test" })
  })

  it("returns null for a restricted CLIENT account even though isActive is true", async () => {
    setQueryResult({
      id: "u1",
      role: "CLIENT",
      email: "CL-0002",
      name: "Earl Test",
      isActive: true,
      isRestricted: true,
    })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toBeNull()
  })

  it("returns null for a restricted SUPERADMIN account even though isActive is true", async () => {
    setQueryResult({
      id: "u1",
      role: "SUPERADMIN",
      email: "super@nrm.com",
      name: "Super",
      isActive: true,
      isRestricted: true,
    })
    const result = await getSessionUserFromToken(makeToken("u1"))
    expect(result).toBeNull()
  })
})
