import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { parsePagination } from "@/lib/api/pagination"
import { ok } from "@/lib/api/response"
import { hashPassword } from "@/lib/auth/password"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { createUserSchema } from "@/lib/validations/api"

export async function GET(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["SUPERADMIN"])
    if (auth.error) return auth.error
    const paging = parsePagination(new URL(request.url).searchParams)
    const result = await adminRepository.listUsers({
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
    const auth = await requireRole(["SUPERADMIN"])
    if (auth.error) return auth.error
    const { data, error } = await parseJsonWithSchema(request, createUserSchema)
    if (error || !data) return error

    const row = await adminRepository.createUser({
      email: data.email,
      passwordHash: hashPassword(data.password),
      name: data.name,
      role: data.role,
    })
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "CREATE",
      entity: "USER",
      entityId: row.id,
      payload: {
        email: row.email,
        role: row.role,
      },
    })
    return ok(
      {
        id: row.id,
        email: row.email,
        role: row.role,
        name: row.name,
      },
      undefined,
      201,
    )
  })
}
