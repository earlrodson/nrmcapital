import { fail } from "@/lib/api/response"
import { getSessionUser, type SessionRole } from "@/lib/auth/session"

export async function requireAuth() {
  const user = await getSessionUser()
  if (!user) {
    return {
      user: null,
      error: fail("Authentication required.", 401, "UNAUTHORIZED"),
    }
  }

  return { user, error: null }
}

export async function requireRole(allowedRoles: SessionRole[]) {
  const auth = await requireAuth()
  if (!auth.user) {
    return auth
  }

  if (!allowedRoles.includes(auth.user.role)) {
    return {
      user: null,
      error: fail("Insufficient permissions.", 403, "FORBIDDEN"),
    }
  }

  return auth
}
