"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { loansService } from "@/lib/services/loans.service"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { createPaymentSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listPayments(params: { page: number; pageSize: number }) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listPayments(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function createPayment(input: z.infer<typeof createPaymentSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = createPaymentSchema.parse(input)

    const payment = await loansService.recordPayment({
      ...data,
      recordedById: user.userId,
    })

    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "CREATE",
      entity: "PAYMENT",
      entityId: payment.id,
      payload: payment,
    })

    return payment
  })
}

export async function getPaymentSummary() {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.getPaymentSummary()
  })
}
