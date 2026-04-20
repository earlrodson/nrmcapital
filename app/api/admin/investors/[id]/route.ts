import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { updateInvestorSchema } from "@/lib/validations/api"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    const { id } = await params
    const investor = await adminRepository.getInvestorById(id)
    if (!investor) return fail("Investor not found.", 404, "NOT_FOUND")
    return ok(investor)
  })
}

export async function PATCH(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    const { id } = await params
    const { data, error } = await parseJsonWithSchema(request, updateInvestorSchema)
    if (error || !data) return error

    const investor = await adminRepository.updateInvestor(id, {
      name: data.name,
      capitalAmount:
        data.capitalAmount !== undefined ? String(data.capitalAmount) : undefined,
      interestShareRate:
        data.interestShareRate !== undefined ? String(data.interestShareRate) : undefined,
      notes: data.notes,
      isActive: data.isActive,
    })
    if (!investor) return fail("Investor not found.", 404, "NOT_FOUND")
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "UPDATE",
      entity: "INVESTOR",
      entityId: investor.id,
      payload: data,
    })
    return ok(investor)
  })
}
