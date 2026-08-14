import { describe, expect, it, vi, beforeEach } from "vitest"

const getClientById = vi.fn()
const createClientPortalUser = vi.fn()
const updateUser = vi.fn()

vi.mock("@/lib/db/repositories/admin.repository", () => ({
  adminRepository: {
    getClientById: (...args: unknown[]) => getClientById(...args),
    createClientPortalUser: (...args: unknown[]) => createClientPortalUser(...args),
    updateUser: (...args: unknown[]) => updateUser(...args),
  },
}))

import { provisionClientPortalAccount, resetClientPortalPassword } from "@/lib/services/client-portal-provisioning"

describe("provisionClientPortalAccount", () => {
  beforeEach(() => {
    getClientById.mockReset()
    createClientPortalUser.mockReset()
  })

  it("throws NOT_FOUND when the client doesn't exist", async () => {
    getClientById.mockResolvedValue(null)
    await expect(provisionClientPortalAccount("missing-client")).rejects.toThrow("NOT_FOUND")
    expect(createClientPortalUser).not.toHaveBeenCalled()
  })

  it("throws VALIDATION_ERROR when the client already has portal access (idempotency guard)", async () => {
    getClientById.mockResolvedValue({ id: "client-1", userId: "user-1", firstName: "Ana", lastName: "Reyes" })
    await expect(provisionClientPortalAccount("client-1")).rejects.toThrow("VALIDATION_ERROR")
    expect(createClientPortalUser).not.toHaveBeenCalled()
  })

  it("generates a password, creates the user, and links the client", async () => {
    getClientById.mockResolvedValue({
      id: "client-1",
      clientNumber: "CL-0001",
      userId: null,
      firstName: "Ana",
      lastName: "Reyes",
    })
    createClientPortalUser.mockResolvedValue({
      user: { id: "new-user-1" },
      client: { id: "client-1" },
    })

    const result = await provisionClientPortalAccount("client-1")

    expect(result.clientId).toBe("client-1")
    expect(result.loginId).toBe("CL-0001")
    expect(result.userId).toBe("new-user-1")
    expect(typeof result.password).toBe("string")
    expect(result.password.length).toBeGreaterThan(0)

    expect(createClientPortalUser).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: "client-1", name: "Ana Reyes" }),
    )
    const passedHash = createClientPortalUser.mock.calls[0][0].passwordHash
    expect(passedHash).not.toBe(result.password)
  })
})

describe("resetClientPortalPassword", () => {
  beforeEach(() => {
    getClientById.mockReset()
    updateUser.mockReset()
  })

  it("throws NOT_FOUND when the client doesn't exist", async () => {
    getClientById.mockResolvedValue(null)
    await expect(resetClientPortalPassword("missing-client")).rejects.toThrow("NOT_FOUND")
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("throws VALIDATION_ERROR when the client has no portal account yet", async () => {
    getClientById.mockResolvedValue({ id: "client-1", userId: null })
    await expect(resetClientPortalPassword("client-1")).rejects.toThrow("VALIDATION_ERROR")
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("generates a fresh password and updates the linked user", async () => {
    getClientById.mockResolvedValue({ id: "client-1", clientNumber: "CL-0001", userId: "user-1" })
    updateUser.mockResolvedValue({ id: "user-1" })

    const result = await resetClientPortalPassword("client-1")

    expect(result.loginId).toBe("CL-0001")
    expect(result.userId).toBe("user-1")
    expect(typeof result.password).toBe("string")
    expect(updateUser).toHaveBeenCalledWith("user-1", expect.objectContaining({ passwordHash: expect.any(String) }))
  })
})
