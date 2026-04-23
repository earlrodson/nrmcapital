import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { hashPassword } from "@/lib/auth/password"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { resetUserPasswordSchema } from "@/lib/validations/api"

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const { data, error } = await parseJsonWithSchema(request, resetUserPasswordSchema)
    if (error || !data) return error

    const row = await adminRepository.updateUser(id, {
      passwordHash: hashPassword(data.password),
    })
    if (!row) {
      return fail("User not found.", 404, "NOT_FOUND")
    }
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "PASSWORD_RESET",
      entity: "USER",
      entityId: row.id,
      payload: { passwordReset: true },
    })
    return ok({ userId: row.id, passwordReset: true })
  })
}
