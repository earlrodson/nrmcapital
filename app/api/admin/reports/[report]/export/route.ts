import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { fail } from "@/lib/api/response"

export async function GET() {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    return fail("Report export is not yet implemented.", 501, "NOT_IMPLEMENTED")
  })
}
