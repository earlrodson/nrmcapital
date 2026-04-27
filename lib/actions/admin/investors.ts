"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { createInvestorSchema, updateInvestorSchema, createFundingTransactionSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listInvestors(params: { page: number; pageSize: number }) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listInvestors(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function createInvestor(input: z.infer<typeof createInvestorSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = createInvestorSchema.parse(input)
    const investor = await adminRepository.createInvestor(data)
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "CREATE",
      entity: "INVESTOR",
      entityId: investor.id,
      payload: investor,
    })
    return investor
  })
}

export async function getInvestorById(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const investor = await adminRepository.getInvestorById(id)
    if (!investor) throw new Error("NOT_FOUND: Investor not found.")
    return investor
  })
}

export async function updateInvestor(id: string, input: z.infer<typeof updateInvestorSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = updateInvestorSchema.parse(input)

    const investor = await adminRepository.updateInvestor(id, {
      name: data.name,
      capitalAmount: data.capitalAmount !== undefined ? String(data.capitalAmount) : undefined,
      interestShareRate: data.interestShareRate !== undefined ? String(data.interestShareRate) : undefined,
      notes: data.notes,
      isActive: data.isActive,
    })
    if (!investor) throw new Error("NOT_FOUND: Investor not found.")
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "UPDATE",
      entity: "INVESTOR",
      entityId: investor.id,
      payload: data,
    })
    return investor
  })
}

export async function listFundingTransactions(params: { page: number; pageSize: number }) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listFundingTransactions(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function createFundingTransaction(input: z.infer<typeof createFundingTransactionSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = createFundingTransactionSchema.parse(input)

    const row = await adminRepository.createFundingTransaction({
      ...data,
      recordedById: user.userId,
    })
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "CREATE",
      entity: "FUNDING_TRANSACTION",
      entityId: row.id,
      payload: row,
    })
    return row
  })
}

export async function getFundingSummary() {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.getFundingSummary()
  })
}
