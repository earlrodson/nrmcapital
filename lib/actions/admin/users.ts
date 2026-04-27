"use server"

import { usersRepository } from "@/lib/db/repositories/users.repository"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { hashPassword } from "@/lib/auth/password"
import { createUserSchema, resetUserPasswordSchema, updateUserSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listUsers(params: { page: number; pageSize: number }) {
  return withActionError(async () => {
    await requireActionRole(["SUPERADMIN"])
    const result = await usersRepository.listUsers(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  return withActionError(async () => {
    const adminUser = await requireActionRole(["SUPERADMIN"])
    const data = createUserSchema.parse(input)

    const row = await usersRepository.createUser({
      email: data.email,
      passwordHash: hashPassword(data.password),
      name: data.name,
      role: data.role,
    })

    await adminRepository.createAuditLog({
      userId: adminUser.userId,
      action: "CREATE",
      entity: "USER",
      entityId: row.id,
      payload: {
        email: row.email,
        role: row.role,
      },
    })

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.name,
    }
  })
}

export async function getUserById(id: string) {
  return withActionError(async () => {
    await requireActionRole(["SUPERADMIN"])
    const row = await usersRepository.findById(id)
    if (!row) throw new Error("NOT_FOUND: User not found.")

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      name: row.name,
      lastLoginAt: row.lastLoginAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }
  })
}

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>) {
  return withActionError(async () => {
    const adminUser = await requireActionRole(["SUPERADMIN"])
    const data = updateUserSchema.parse(input)

    const row = await usersRepository.updateUser(id, {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    })
    if (!row) throw new Error("NOT_FOUND: User not found.")

    await adminRepository.createAuditLog({
      userId: adminUser.userId,
      action: "UPDATE",
      entity: "USER",
      entityId: row.id,
      payload: data,
    })

    return {
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      name: row.name,
    }
  })
}

export async function deactivateUser(id: string) {
  return withActionError(async () => {
    const adminUser = await requireActionRole(["SUPERADMIN"])
    const row = await usersRepository.updateUser(id, { isActive: false })
    if (!row) throw new Error("NOT_FOUND: User not found.")
    
    await adminRepository.createAuditLog({
      userId: adminUser.userId,
      action: "DEACTIVATE",
      entity: "USER",
      entityId: row.id,
      payload: { isActive: false },
    })
    
    return {
      id: row.id,
      email: row.email,
      isActive: row.isActive,
    }
  })
}

export async function resetUserPassword(id: string, input: z.infer<typeof resetUserPasswordSchema>) {
  return withActionError(async () => {
    const adminUser = await requireActionRole(["SUPERADMIN"])
    const data = resetUserPasswordSchema.parse(input)

    const row = await usersRepository.updateUser(id, {
      passwordHash: hashPassword(data.password),
    })
    if (!row) throw new Error("NOT_FOUND: User not found.")

    await adminRepository.createAuditLog({
      userId: adminUser.userId,
      action: "RESET_PASSWORD",
      entity: "USER",
      entityId: row.id,
      payload: { userId: row.id },
    })

    return { id: row.id }
  })
}
