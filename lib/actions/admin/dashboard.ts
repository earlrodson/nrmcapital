"use server"

import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { requireActionRole, withActionError } from "@/lib/actions/utils"

export async function getDashboardSummary() {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.getDashboardSummary()
  })
}

export async function getDashboardActivity(params: { page?: number; pageSize?: number; limit?: number } = {}) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    
    const page = params.page ?? 1
    let pageSize = params.pageSize ?? 20
    
    if (params.limit) {
      pageSize = Math.min(params.limit, 100)
    }

    const result = await adminRepository.getDashboardActivity({ page, pageSize })
    return {
      rows: result.rows,
      page,
      pageSize,
      total: result.total,
    }
  })
}

export async function getTopOverdueLoans(limit = 5) {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    const safeLimit = Math.min(Math.max(limit, 1), 20)
    return adminRepository.getTopOverdueLoans(safeLimit)
  })
}

export async function getDashboardOverview(granularity: "day" | "month" | "year" = "month") {
  return withActionError(async () => {
    await requireActionRole(["ADMIN", "SUPERADMIN"])
    return adminRepository.getDashboardOverview(granularity)
  })
}
