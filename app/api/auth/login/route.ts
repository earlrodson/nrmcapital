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
    const runId = "initial"

    const debugLog = (payload: {
      runId: string
      hypothesisId: string
      location: string
      message: string
      data: Record<string, unknown>
    }) => {
      // #region agent log
      fetch("http://127.0.0.1:7332/ingest/ee94bab0-1b23-40e2-9c3e-7953b5ef7ecc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "d833c9",
        },
        body: JSON.stringify({
          sessionId: "d833c9",
          ...payload,
          timestamp: Date.now(),
        }),
      }).catch(() => {})
      // #endregion
    }

    const startedAt = Date.now()
    try {
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H1",
        location: "app/api/auth/login/route.ts:entry",
        message: "Login route entered",
        data: {
          dbProvider: process.env.DB_PROVIDER ?? "missing",
          hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
          nodeEnv: process.env.NODE_ENV ?? "unknown",
        },
      })
      // #endregion

      const { data, error } = await parseJsonWithSchema(request, loginSchema)
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H1",
        location: "app/api/auth/login/route.ts:parse",
        message: "Login payload parsed",
        data: {
          hasData: Boolean(data),
          hasValidationError: Boolean(error),
          elapsedMs: Date.now() - startedAt,
        },
      })
      // #endregion
      if (error || !data) return error

      const userLookupStartedAt = Date.now()
      const [user] = await db.select().from(users).where(eq(users.email, data.email)).limit(1)
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H2",
        location: "app/api/auth/login/route.ts:user-query",
        message: "User lookup completed",
        data: {
          userFound: Boolean(user),
          elapsedMs: Date.now() - userLookupStartedAt,
        },
      })
      // #endregion
      if (!user) {
        return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
      }

      const passwordOk = verifyPassword(data.password, user.passwordHash)
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H3",
        location: "app/api/auth/login/route.ts:password-verify",
        message: "Password verification finished",
        data: {
          passwordOk,
          hashLength: user.passwordHash.length,
        },
      })
      // #endregion
      if (!passwordOk) {
        return fail("Invalid credentials.", 401, "INVALID_CREDENTIALS")
      }

      const createSessionStartedAt = Date.now()
      const sessionUser = await createSession(user.id)
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H4",
        location: "app/api/auth/login/route.ts:create-session",
        message: "Session creation completed",
        data: {
          sessionUserId: sessionUser.userId,
          role: sessionUser.role,
          elapsedMs: Date.now() - createSessionStartedAt,
        },
      })
      // #endregion
      return ok(sessionUser)
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error)
      const safeMessage = rawMessage.replace(/postgresql:\/\/[^@]+@/g, "postgresql://***@").slice(0, 200)
      // #region agent log
      debugLog({
        runId,
        hypothesisId: "H5",
        location: "app/api/auth/login/route.ts:catch",
        message: "Login route threw",
        data: {
          errorType: error instanceof Error ? error.name : typeof error,
          errorMessage: safeMessage,
          elapsedMs: Date.now() - startedAt,
        },
      })
      // #endregion
      throw error
    }
  })
}
