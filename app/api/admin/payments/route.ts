import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { parsePagination } from "@/lib/api/pagination"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { loansService } from "@/lib/services/loans.service"
import { createPaymentSchema } from "@/lib/validations/api"

export async function GET(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const paging = parsePagination(new URL(request.url).searchParams)
    const result = await adminRepository.listPayments({
      page: paging.page,
      pageSize: paging.pageSize,
    })
    return ok(result.rows, {
      page: paging.page,
      pageSize: paging.pageSize,
      total: result.total,
    })
  })
}

export async function POST(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { data, error } = await parseJsonWithSchema(request, createPaymentSchema)
    if (error || !data) return error

    const payment = await loansService.recordPayment({
      ...data,
      recordedById: auth.user.userId,
    })

    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "CREATE",
      entity: "PAYMENT",
      entityId: payment.id,
      payload: payment,
    })

    return ok(payment, undefined, 201)
  })
}
