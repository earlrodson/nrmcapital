import { randomBytes } from "node:crypto"

import { hashPassword } from "@/lib/auth/password"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

/**
 * Shared by the admin "Create Portal Access" action and the future
 * client-account backfill script so the two don't duplicate the same
 * generate-password / create-user / link-client logic.
 */
export function generateClientPortalPassword(): string {
  return randomBytes(9).toString("base64url")
}

export async function provisionClientPortalAccount(clientId: string): Promise<{
  clientId: string
  loginId: string
  userId: string
  password: string
}> {
  const client = await adminRepository.getClientById(clientId)
  if (!client) {
    throw new Error("NOT_FOUND: Client not found.")
  }
  if (client.userId) {
    throw new Error("VALIDATION_ERROR: Client already has portal access.")
  }

  const password = generateClientPortalPassword()
  const result = await adminRepository.createClientPortalUser({
    clientId,
    passwordHash: hashPassword(password),
    name: `${client.firstName} ${client.lastName}`,
  })
  if (!result) {
    throw new Error("NOT_FOUND: Client not found.")
  }

  return { clientId, loginId: client.clientNumber, userId: result.user.id, password }
}

export async function resetClientPortalPassword(clientId: string): Promise<{
  clientId: string
  loginId: string
  userId: string
  password: string
}> {
  const client = await adminRepository.getClientById(clientId)
  if (!client) {
    throw new Error("NOT_FOUND: Client not found.")
  }
  if (!client.userId) {
    throw new Error("VALIDATION_ERROR: Client does not have portal access yet.")
  }

  const password = generateClientPortalPassword()
  const updated = await adminRepository.updateUser(client.userId, { passwordHash: hashPassword(password) })
  if (!updated) {
    throw new Error("NOT_FOUND: Client's portal account not found.")
  }

  return { clientId, loginId: client.clientNumber, userId: client.userId, password }
}
