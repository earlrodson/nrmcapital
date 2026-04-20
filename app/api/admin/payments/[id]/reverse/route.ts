import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { fail } from "@/lib/api/response"

export async function POST() {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error
    return fail("Payment reversal is not yet implemented.", 501, "NOT_IMPLEMENTED")
  })
}
