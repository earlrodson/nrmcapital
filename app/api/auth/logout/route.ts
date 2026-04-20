import { withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { destroySession } from "@/lib/auth/session"

export async function POST() {
  return withServerError(async () => {
    await destroySession()
    return ok({ loggedOut: true })
  })
}
