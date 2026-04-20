import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { fail } from "@/lib/api/response"

export async function POST() {
  return withServerError(async () => {
    const auth = await requireRole(["SUPERADMIN"])
    if (auth.error) return auth.error
    return fail("Password reset endpoint is not yet implemented.", 501, "NOT_IMPLEMENTED")
  })
}
