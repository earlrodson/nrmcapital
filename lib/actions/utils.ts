import { getSessionUser, type SessionRole } from "@/lib/auth/session"

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string }

export async function requireActionRole(allowedRoles: SessionRole[]) {
  const user = await getSessionUser()
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.")
  }

  if (!allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN: Insufficient permissions.")
  }

  return user
}

export async function getActionUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error("UNAUTHORIZED: Authentication required.")
  }
  return user
}

export async function withActionError<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error: unknown) {
    const rawMessage = error instanceof Error ? error.message : ""
    const [prefix, ...rest] = rawMessage.split(":")
    const code = /^[A-Z_]+$/.test(prefix) ? prefix : undefined
    const detail = rest.join(":").trim()

    const safeMessageByCode: Record<string, string> = {
      UNAUTHORIZED: "Authentication required.",
      FORBIDDEN: "You do not have permission to perform this action.",
      NOT_FOUND: "Requested record was not found.",
      VALIDATION_ERROR: "Invalid input provided.",
    }

    const safeMessage =
      code && detail
        ? detail
        : (code ? safeMessageByCode[code] : undefined) ?? "Something went wrong. Please try again."

    console.error("Action error:", error)
    return {
      success: false,
      error: safeMessage,
      code,
    }
  }
}
