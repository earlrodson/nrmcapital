import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { parsePagination } from "@/lib/api/pagination"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { createLoanSchema } from "@/lib/validations/api"

export async function GET(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const paging = parsePagination(url.searchParams)
    const search = url.searchParams.get("search")
    const status = url.searchParams.get("status")

    const result = await adminRepository.listLoans({
      page: paging.page,
      pageSize: paging.pageSize,
      search,
      status,
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

    const { data, error } = await parseJsonWithSchema(request, createLoanSchema)
    if (error || !data) return error

    const loan = await adminRepository.createLoan(data)
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "CREATE",
      entity: "LOAN",
      entityId: loan.id,
      payload: loan,
    })
    return ok(loan, undefined, 201)
  })
}
