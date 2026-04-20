import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

export async function GET() {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const rows = await adminRepository.getDashboardActivity()
    return ok(rows)
  })
}
