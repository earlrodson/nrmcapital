import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { adminRepository } from "@/lib/db/repositories/admin.repository"
import { updateClientSchema } from "@/lib/validations/api"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const client = await adminRepository.getClientById(id)
    if (!client) {
      return fail("Client not found.", 404, "NOT_FOUND")
    }
    return ok(client)
  })
}

export async function PATCH(request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const { data, error } = await parseJsonWithSchema(request, updateClientSchema)
    if (error || !data) return error

    const updated = await adminRepository.updateClient(id, {
      userId: data.userId,
      firstName: data.firstName,
      lastName: data.lastName,
      contactNumber: data.contactNumber,
      address: data.address,
      idType: data.idType,
      idNumber: data.idNumber,
      notes: data.notes,
      isActive: data.isActive,
    })
    if (!updated) {
      return fail("Client not found.", 404, "NOT_FOUND")
    }
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "UPDATE",
      entity: "CLIENT",
      entityId: updated.id,
      payload: data,
    })
    return ok(updated)
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params
    const row = await adminRepository.deactivateClient(id)
    if (!row) {
      return fail("Client not found.", 404, "NOT_FOUND")
    }
    await adminRepository.createAuditLog({
      userId: auth.user.userId,
      action: "DEACTIVATE",
      entity: "CLIENT",
      entityId: row.id,
      payload: { isActive: false },
    })
    return ok(row)
  })
}
