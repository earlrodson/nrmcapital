import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

export async function GET() {
  return withServerError(async () => {
    const auth = await requireRole(["CLIENT"])
    if (auth.error) return auth.error

    const client = await adminRepository.getClientByUserId(auth.user.userId)
    if (!client) {
      return fail("Client profile not found.", 404, "NOT_FOUND")
    }

    const rows = await adminRepository.listClientPayments(client.id)
    return ok(rows)
  })
}
