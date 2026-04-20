import { z } from "zod"

import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"

const createAttachmentSchema = z.object({
  uploadedById: z.string().min(1),
  storageKey: z.string().min(1),
  type: z.enum(["GOV_ID", "PROOF_OF_INCOME", "PROOF_OF_BILLING", "CONTRACT", "OTHER"]).optional(),
  fileName: z.string().optional(),
})

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const rows = await adminRepository.listClientAttachments(id)
    return ok(rows)
  })
}

export async function POST(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const { data, error } = await parseJsonWithSchema(request, createAttachmentSchema)
    if (error || !data) return error

    const row = await adminRepository.createAttachment({
      clientId: id,
      uploadedById: data.uploadedById,
      storageKey: data.storageKey,
      type: data.type,
      fileName: data.fileName,
    })
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "CREATE",
      entity: "ATTACHMENT",
      entityId: row.id,
      payload: row,
    })
    return ok(row, undefined, 201)
  })
}
