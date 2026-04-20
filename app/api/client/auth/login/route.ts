import { eq } from "drizzle-orm"

import { users } from "@/drizzle/schema"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { db } from "@/lib/db/client"
import { loginSchema } from "@/lib/validations/api"

export async function POST(request: Request) {
  return withServerError(async () => {
    const { data, error } = await parseJsonWithSchema(request, loginSchema)
    if (error || !data) return error

    const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
    if (!user) {
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }
    if (user.role !== "CLIENT") {
      return fail("This endpoint is for client accounts only.", 403, "FORBIDDEN")
    }
    if (!verifyPassword(data.password, user.passwordHash)) {
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }

    const session = await createSession(user.id)
    return ok(session)
  })
}
