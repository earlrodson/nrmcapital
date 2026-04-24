import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { parsePagination } from "@/lib/api/pagination"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

export async function GET(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")

    let page = 1
    let pageSize = 20
    if (limitParam) {
      const parsedLimit = Number(limitParam)
      pageSize = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 20
    } else {
      const paging = parsePagination(url.searchParams)
      page = paging.page
      pageSize = paging.pageSize
    }

    const result = await adminRepository.getDashboardActivity({ page, pageSize })
    return ok(result.rows, {
      page,
      pageSize,
      total: result.total,
    })
  })
}
