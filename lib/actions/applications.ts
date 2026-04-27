"use server"

import { getSessionUser } from "@/lib/auth/session"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { createLoanApplicationSchema } from "@/lib/validations/api"
import { withActionError } from "@/lib/actions/utils"
import { z } from "zod"

export async function submitLoanApplication(input: z.infer<typeof createLoanApplicationSchema>) {
  return withActionError(async () => {
    const data = createLoanApplicationSchema.parse(input)
    const user = await getSessionUser()
    const row = await adminRepository.createLoanApplication({
      ...data,
      applicantUserId: user?.userId,
    })

    if (user?.userId) {
      await adminRepository.createAuditLog({
        userId: user.userId,
        action: "SUBMIT",
        entity: "LOAN_APPLICATION",
        entityId: row.id,
        payload: row,
      })
    }

    return row
  })
}
