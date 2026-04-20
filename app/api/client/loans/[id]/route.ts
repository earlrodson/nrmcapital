import { eq } from "drizzle-orm"

import { loans } from "@/drizzle/schema"
import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { db } from "@/lib/db/client"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["CLIENT"])
    if (auth.error) return auth.error
    const client = await adminRepository.getClientByUserId(auth.user.userId)
    if (!client) return fail("Client profile not found.", 404, "NOT_FOUND")

    const { id } = await params
    const [loan] = await db
      .select()
      .from(loans)
      .where(eq(loans.id, id))
      .limit(1)
    if (!loan || loan.clientId !== client.id) {
      return fail("Loan not found.", 404, "NOT_FOUND")
    }
    return ok(loan)
  })
}
