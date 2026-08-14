import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { clearLoginThrottle, isLoginThrottled, recordFailedLoginAttempt } from "@/lib/auth/login-throttle"
import { verifyPassword } from "@/lib/auth/password"
import { createSession } from "@/lib/auth/session"
import { usersRepository } from "@/lib/db/repositories/users.repository"
import { loginSchema } from "@/lib/validations/api"

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim()
  return request.headers.get("x-real-ip") ?? "unknown"
}

export async function POST(request: Request) {
  return withServerError(async () => {
    const { data, error } = await parseJsonWithSchema(request, loginSchema)
    if (error || !data) return error

    const ip = getClientIp(request)

    if (await isLoginThrottled(data.identifier, ip)) {
      return fail("Too many attempts. Please try again later.", 429, "TOO_MANY_ATTEMPTS")
    }

    const user = await usersRepository.findByEmail(data.identifier)
    if (!user) {
      await recordFailedLoginAttempt(data.identifier, ip)
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }

    const passwordOk = verifyPassword(data.password, user.passwordHash)
    if (!passwordOk) {
      await recordFailedLoginAttempt(data.identifier, ip)
      return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
    }

    if (user.isRestricted) {
      return fail("This account has been restricted. Contact an administrator.", 403, "ACCOUNT_RESTRICTED")
    }

    await clearLoginThrottle(data.identifier)
    const sessionUser = await createSession(user.id)
    return ok(sessionUser)
  })
}
