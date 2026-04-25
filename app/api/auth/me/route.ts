import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { getSessionUser } from "@/lib/auth/session"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { z } from "zod"

const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
})

export async function GET() {
  return withServerError(async () => {
    const user = await getSessionUser()
    if (!user) {
      return fail("Not authenticated.", 401, "UNAUTHORIZED")
    }

    return ok(user)
  })
}

export async function PATCH(request: Request) {
  return withServerError(async () => {
    const user = await getSessionUser()
    if (!user) {
      return fail("Not authenticated.", 401, "UNAUTHORIZED")
    }

    const body = await request.json().catch(() => null)
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) {
      return fail("Invalid profile payload.", 400, "BAD_REQUEST", {
        issues: parsed.error.issues,
      })
    }

    const updated = await adminRepository.updateUser(user.userId, {
      name: parsed.data.name,
    })
    if (!updated) {
      return fail("User not found.", 404, "NOT_FOUND")
    }

    return ok({
      userId: updated.id,
      role: updated.role,
      email: updated.email,
      name: updated.name,
    })
  })
}
