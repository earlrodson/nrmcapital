import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { updateLoanSchema } from "@/lib/validations/api"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const row = await adminRepository.getLoanById(id)
    if (!row) {
      return fail("Loan not found.", 404, "NOT_FOUND")
    }
    return ok(row)
  })
}

export async function PATCH(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const { data, error } = await parseJsonWithSchema(request, updateLoanSchema)
    if (error || !data) return error

    const row = await adminRepository.updateLoan(id, {
      status: data.status,
      disbursementDate: data.disbursementDate === null ? null : data.disbursementDate,
      actualEndDate: data.actualEndDate === null ? null : data.actualEndDate,
      notes: data.notes,
    })
    if (!row) {
      return fail("Loan not found.", 404, "NOT_FOUND")
    }
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "UPDATE",
      entity: "LOAN",
      entityId: row.id,
      payload: data,
    })
    return ok(row)
  })
}
