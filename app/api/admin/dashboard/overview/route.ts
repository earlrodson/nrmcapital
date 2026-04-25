import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

type OverviewGranularity = "day" | "month" | "year"

function parseGranularity(value: string | null): OverviewGranularity {
  if (value === "day" || value === "year") return value
  return "month"
}

export async function GET(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const granularity = parseGranularity(url.searchParams.get("granularity"))
    const rows = await adminRepository.getDashboardOverview(granularity)
    return ok(rows)
  })
}
