"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { createLoanSchema, updateLoanSchema, updatePaymentScheduleDueDateSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listLoans(params: { 
  page: number; 
  pageSize: number; 
  search?: string | null; 
  status?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
}) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listLoans(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
      summary: result.summary,
    }
  })
}

export async function createLoan(input: z.infer<typeof createLoanSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = createLoanSchema.parse(input)

    const loan = await adminRepository.createLoan(data)
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "CREATE",
      entity: "LOAN",
      entityId: loan.id,
      payload: loan,
    })
    return loan
  })
}

export async function getLoanById(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const row = await adminRepository.getLoanById(id)
    if (!row) throw new Error("NOT_FOUND: Loan not found.")
    return row
  })
}

export async function updateLoan(id: string, input: z.infer<typeof updateLoanSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = updateLoanSchema.parse(input)

    const row = await adminRepository.updateLoan(id, {
      status: data.status,
      disbursementDate: data.disbursementDate === null ? null : data.disbursementDate,
      actualEndDate: data.actualEndDate === null ? null : data.actualEndDate,
      notes: data.notes,
    })
    if (!row) throw new Error("NOT_FOUND: Loan not found.")
    
    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "UPDATE",
      entity: "LOAN",
      entityId: row.id,
      payload: data,
    })
    return row
  })
}

export async function getLoanSchedule(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const rows = await adminRepository.listLoanSchedule(id)
    const loan = await adminRepository.getLoanById(id)
    const totalPaid = Number(loan?.totalPaid ?? "0")
    let remainingPool = Math.max(0, totalPaid)

    return rows.map((row) => {
      const amountDue = Number(row.amountDue ?? "0")
      const storedPaid = Number(row.amountPaid ?? "0")
      const fifoPaid = Math.min(amountDue, remainingPool)
      remainingPool = Math.max(0, remainingPool - fifoPaid)
      const effectiveAmountPaidNumber = Math.min(amountDue, Math.max(storedPaid, fifoPaid))
      const remainingAmountNumber = Math.max(0, amountDue - effectiveAmountPaidNumber)
      return {
        ...row,
        remainingAmount: remainingAmountNumber.toFixed(2),
        effectiveAmountPaid: effectiveAmountPaidNumber.toFixed(2),
        effectiveRemainingAmount: remainingAmountNumber.toFixed(2),
      }
    })
  })
}

export async function getLoanContextById(loanIdOrPrefix: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const row = await adminRepository.findLoanContextById(loanIdOrPrefix)
    return row
      ? {
          loan: row.loan,
          client: row.client,
        }
      : null
  })
}

export async function getLoanPayments(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.listLoanPayments(id)
  })
}

export async function updatePaymentScheduleDueDate(input: z.infer<typeof updatePaymentScheduleDueDateSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = updatePaymentScheduleDueDateSchema.parse(input)
    const row = await adminRepository.updateLoanScheduleDueDate(data.scheduleId, data.dueDate)
    if (!row) throw new Error("NOT_FOUND: Payment schedule not found.")

    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "UPDATE",
      entity: "PAYMENT_SCHEDULE",
      entityId: row.id,
      payload: {
        loanId: row.loanId,
        termNumber: row.termNumber,
        dueDate: row.dueDate,
      },
    })
    return row
  })
}
