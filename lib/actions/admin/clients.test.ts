import { describe, expect, it, vi, beforeEach } from "vitest"

const getSessionUser = vi.fn()
const provisionClientPortalAccount = vi.fn()
const resetClientPortalPassword = vi.fn()
const createAuditLog = vi.fn()

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: (...args: unknown[]) => getSessionUser(...args),
}))

vi.mock("@/lib/services/client-portal-provisioning", () => ({
  provisionClientPortalAccount: (...args: unknown[]) => provisionClientPortalAccount(...args),
  resetClientPortalPassword: (...args: unknown[]) => resetClientPortalPassword(...args),
}))

vi.mock("@/lib/db/repositories/admin.repository", () => ({
  adminRepository: {
    createAuditLog: (...args: unknown[]) => createAuditLog(...args),
  },
}))

import { createClientPortalAccess, resetClientPortalAccessPassword } from "@/lib/actions/admin/clients"

describe("resetClientPortalAccessPassword", () => {
  beforeEach(() => {
    getSessionUser.mockReset()
    resetClientPortalPassword.mockReset()
    createAuditLog.mockReset()
  })

  it("rejects when there is no session", async () => {
    getSessionUser.mockResolvedValue(null)
    const result = await resetClientPortalAccessPassword("client-1")
    expect(result).toEqual({ success: false, error: "Authentication required.", code: "UNAUTHORIZED" })
    expect(resetClientPortalPassword).not.toHaveBeenCalled()
  })

  it("rejects a CLIENT-role session (wrong role)", async () => {
    getSessionUser.mockResolvedValue({ userId: "u1", role: "CLIENT", email: "c1", name: "Client" })
    const result = await resetClientPortalAccessPassword("client-1")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ code: "FORBIDDEN" })
    expect(resetClientPortalPassword).not.toHaveBeenCalled()
  })

  it("regenerates the password and writes an audit log for an ADMIN session", async () => {
    getSessionUser.mockResolvedValue({ userId: "admin-1", role: "ADMIN", email: "a@nrm.com", name: "Admin" })
    resetClientPortalPassword.mockResolvedValue({ clientId: "client-1", userId: "user-1", password: "new-generated-pw" })

    const result = await resetClientPortalAccessPassword("client-1")

    expect(result).toEqual({
      success: true,
      data: { clientId: "client-1", userId: "user-1", password: "new-generated-pw" },
    })
    expect(resetClientPortalPassword).toHaveBeenCalledWith("client-1")
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-1", action: "RESET_PORTAL_PASSWORD", entity: "CLIENT", entityId: "client-1" }),
    )
  })

  it("allows a SUPERADMIN session too", async () => {
    getSessionUser.mockResolvedValue({ userId: "super-1", role: "SUPERADMIN", email: "s@nrm.com", name: "Super" })
    resetClientPortalPassword.mockResolvedValue({ clientId: "client-1", userId: "user-1", password: "another-pw" })

    const result = await resetClientPortalAccessPassword("client-1")
    expect(result.success).toBe(true)
  })
})

describe("createClientPortalAccess", () => {
  beforeEach(() => {
    getSessionUser.mockReset()
    provisionClientPortalAccount.mockReset()
    createAuditLog.mockReset()
  })

  it("rejects a CLIENT-role session", async () => {
    getSessionUser.mockResolvedValue({ userId: "u1", role: "CLIENT", email: "c1", name: "Client" })
    const result = await createClientPortalAccess("client-1")
    expect(result.success).toBe(false)
    expect(result).toMatchObject({ code: "FORBIDDEN" })
    expect(provisionClientPortalAccount).not.toHaveBeenCalled()
  })

  it("provisions the account and writes an audit log for an ADMIN session", async () => {
    getSessionUser.mockResolvedValue({ userId: "admin-1", role: "ADMIN", email: "a@nrm.com", name: "Admin" })
    provisionClientPortalAccount.mockResolvedValue({ clientId: "client-1", userId: "user-1", password: "initial-pw" })

    const result = await createClientPortalAccess("client-1")

    expect(result).toEqual({
      success: true,
      data: { clientId: "client-1", userId: "user-1", password: "initial-pw" },
    })
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "admin-1", action: "CREATE_PORTAL_ACCESS", entity: "CLIENT", entityId: "client-1" }),
    )
  })
})
