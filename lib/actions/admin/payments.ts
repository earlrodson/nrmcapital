"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { loansService } from "@/lib/services/loans.service"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { createPaymentSchema, removePaymentSchema, updatePaymentSchema } from "@/lib/validations/api"
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

function toMoneyString(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Payment amount must be a positive finite number.")
    }
    return value.toFixed(2)
  }

  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error("Payment amount must be a positive decimal with up to 2 decimal places.")
  }
  return normalized
}

export async function updatePayment(input: z.infer<typeof updatePaymentSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = updatePaymentSchema.parse(input)
    const amount = toMoneyString(data.amount)

    const result = await adminRepository.updateLoanPayment({
      paymentId: data.paymentId,
      actorUserId: user.userId,
      amount,
      paymentType: data.paymentType,
      paymentMethod: data.paymentMethod,
      paymentScheduleId: data.paymentScheduleId ?? null,
      paymentDate: data.paymentDate,
      penaltyReason: data.paymentType === "PENALTY" ? data.penaltyReason?.trim() ?? null : null,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    })

    if (!result) throw new Error("NOT_FOUND: Payment not found.")

    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "UPDATE",
      entity: "PAYMENT",
      entityId: result.after.id,
      payload: {
        before: result.before,
        after: result.after,
      },
    })

    return result.after
  })
}

export async function removePayment(input: z.infer<typeof removePaymentSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = removePaymentSchema.parse(input)

    const deletedPayment = await adminRepository.removeLoanPayment({
      paymentId: data.paymentId,
      reason: data.reason,
      actorUserId: user.userId,
    })
    if (!deletedPayment) throw new Error("NOT_FOUND: Payment not found.")

    return { success: true }
  })
}

export async function listPaymentEventsForLoan(loanId: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.listPaymentEventsByLoan(loanId)
  })
}

export async function getPaymentSummary() {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.getPaymentSummary()
  })
}
