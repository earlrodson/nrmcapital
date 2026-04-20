import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { createSession, getSessionUser } from "@/lib/auth/session"

export async function POST() {
  return withServerError(async () => {
    const user = await getSessionUser()
    if (!user) {
      return fail("Not authenticated.", 401, "UNAUTHORIZED")
    }

    const refreshed = await createSession(user.userId)
    return ok(refreshed)
  })
}
