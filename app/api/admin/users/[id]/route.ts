import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { updateUserSchema } from "@/lib/validations/api"

interface Params {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["SUPERADMIN"])
    if (auth.error) return auth.error
    const { id } = await params

    const { data, error } = await parseJsonWithSchema(request, updateUserSchema)
    if (error || !data) return error

    const row = await adminRepository.updateUser(id, {
      name: data.name,
      role: data.role,
      isActive: data.isActive,
    })
    if (!row) {
      return fail("User not found.", 404, "NOT_FOUND")
    }

    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "UPDATE",
      entity: "USER",
      entityId: row.id,
      payload: data,
    })
    return ok({
      id: row.id,
      email: row.email,
      role: row.role,
      isActive: row.isActive,
      name: row.name,
    })
  })
}
