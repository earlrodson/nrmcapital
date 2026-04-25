import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    const { id } = await params
    const rows = await adminRepository.listLoanSchedule(id)
    const loan = await adminRepository.getLoanById(id)
    const totalPaid = Number(loan?.totalPaid ?? "0")
    let remainingPool = Math.max(0, totalPaid)

    const data = rows.map((row) => {
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
    return ok(data)
  })
}
