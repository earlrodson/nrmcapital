"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { createClientSchema, updateClientSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listClients(params: { page: number; pageSize: number; search?: string | null; status?: string | null }) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listClients(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function getCurrentAdminUser() {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    return user
  })
}

export async function createClient(input: z.infer<typeof createClientSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = createClientSchema.parse(input)

    const row = await adminRepository.createClient(data)
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "CREATE",
      entity: "CLIENT",
      entityId: row.id,
      payload: row,
    })
    return row
  })
}

export async function getClientById(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const client = await adminRepository.getClientById(id)
    if (!client) throw new Error("NOT_FOUND: Client not found.")
    return client
  })
}

export async function updateClient(id: string, input: z.infer<typeof updateClientSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = updateClientSchema.parse(input)

    const updated = await adminRepository.updateClient(id, data)
    if (!updated) throw new Error("NOT_FOUND: Client not found.")
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "UPDATE",
      entity: "CLIENT",
      entityId: updated.id,
      payload: data,
    })
    return updated
  })
}

export async function deactivateClient(id: string) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const row = await adminRepository.deactivateClient(id)
    if (!row) throw new Error("NOT_FOUND: Client not found.")
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "DEACTIVATE",
      entity: "CLIENT",
      entityId: row.id,
      payload: { isActive: false },
    })
    return row
  })
}

export async function listClientLoans(clientId: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.listClientLoans(clientId)
  })
}

export async function listClientPayments(clientId: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.listClientPayments(clientId)
  })
}

export async function listClientAttachments(clientId: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.listClientAttachments(clientId)
  })
}

export async function createClientAttachment(input: {
  clientId: string
  uploadedById: string
  storageKey: string
  type?: "GOV_ID" | "PROOF_OF_INCOME" | "PROOF_OF_BILLING" | "CONTRACT" | "OTHER"
  fileName?: string
}) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.createAttachment(input)
  })
}
