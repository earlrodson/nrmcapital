import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { getSessionUser } from "@/lib/auth/session"

export async function GET() {
  return withServerError(async () => {
    const user = await getSessionUser()
    if (!user) {
      return fail("Not authenticated.", 401, "UNAUTHORIZED")
    }

    return ok(user)
  })
}
