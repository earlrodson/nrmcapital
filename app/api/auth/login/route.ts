import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { usersRepository } from "@/lib/db/repositories/users.repository"
import { loginSchema } from "@/lib/validations/api"

export async function POST(request: Request) {
  return withServerError(async () => {
    const { data, error } = await parseJsonWithSchema(request, loginSchema)
    if (error || !data) return error

    const user = await usersRepository.findByEmail(data.email)
    if (!user) {
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }

    const passwordOk = verifyPassword(data.password, user.passwordHash)
    if (!passwordOk) {
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }

    const sessionUser = await createSession(user.id)
    return ok(sessionUser)
  })
}
