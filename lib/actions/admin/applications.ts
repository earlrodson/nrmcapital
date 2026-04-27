"use server"

import { requireActionRole, withActionError } from "@/lib/actions/utils"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { reviewLoanApplicationSchema } from "@/lib/validations/api"
import { z } from "zod"

export async function listLoanApplications(params: { page: number; pageSize: number; search?: string | null; status?: string | null }) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const result = await adminRepository.listLoanApplications(params)
    return {
      rows: result.rows,
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
    }
  })
}

export async function getLoanApplicationById(id: string) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const application = await adminRepository.getLoanApplicationById(id)
    if (!application) throw new Error("NOT_FOUND: Application not found.")
    return application
  })
}

export async function reviewLoanApplication(id: string, input: z.infer<typeof reviewLoanApplicationSchema>) {
  return withActionError(async () => {
    const user = await requireActionRole(["ADMIN", "SUPERADMIN"])
    const data = reviewLoanApplicationSchema.parse(input)

    if (data.decision === "APPROVED") {
      const result = await adminRepository.approveLoanApplication({
        applicationId: id,
        reviewedById: user.userId,
        notes: data.notes,
      })
      if (!result) throw new Error("NOT_FOUND: Application not found.")

      await Promise.all([
        adminRepository.createAuditLog({
          userId: user.userId,
          action: "APPROVE",
          entity: "LOAN_APPLICATION",
          entityId: result.application.id,
          payload: result.application,
        }),
        adminRepository.createAuditLog({
          userId: user.userId,
          action: "CREATE",
          entity: "LOAN",
          entityId: result.loan.id,
          payload: result.loan,
        }),
      ])
      return result
    }

    const result = await adminRepository.rejectLoanApplication({
      applicationId: id,
      reviewedById: user.userId,
      rejectionReason: data.rejectionReason,
    })
    if (!result) throw new Error("NOT_FOUND: Application not found.")

    await adminRepository.createAuditLog({
      userId: user.userId,
      action: "REJECT",
      entity: "LOAN_APPLICATION",
      entityId: result.id,
      payload: result,
    })
    return result
  })
}
