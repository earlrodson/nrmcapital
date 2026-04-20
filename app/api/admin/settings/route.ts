import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { updateSystemSettingSchema } from "@/lib/validations/api"

export async function GET() {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    const rows = await adminRepository.listSystemSettings()
    return ok(rows)
  })
}

export async function PATCH(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    const { data, error } = await parseJsonWithSchema(request, updateSystemSettingSchema)
    if (error || !data) return error

    const row = await adminRepository.upsertSystemSetting(data)
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "UPDATE",
      entity: "SYSTEM_SETTING",
      entityId: row.id,
      payload: row,
    })
    return ok(row)
  })
}
