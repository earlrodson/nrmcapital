import { PutObjectCommand } from "@aws-sdk/client-s3"
import { randomUUID } from "node:crypto"

import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { R2_BUCKET_NAME, s3Client } from "@/lib/api/s3"

export async function POST(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return fail("Cloudflare R2 is not configured. Attachments are currently disabled.", 503, "SERVICE_UNAVAILABLE")
    }

    const formData = await request.formData()
    const rawFile = formData.get("file")
    const folder = String(formData.get("folder") ?? "attachments").trim() || "attachments"

    if (!(rawFile instanceof File)) {
      return fail("Missing file payload.", 422, "VALIDATION_ERROR")
    }

    const fileExtension = rawFile.name.includes(".") ? rawFile.name.split(".").pop() : undefined
    const uniqueFilename = fileExtension ? `${randomUUID()}.${fileExtension}` : randomUUID()
    const storageKey = `${folder}/${uniqueFilename}`

    const fileBuffer = Buffer.from(await rawFile.arrayBuffer())
    await s3Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: storageKey,
        Body: fileBuffer,
        ContentType: rawFile.type || "application/octet-stream",
      }),
    )

    return ok({
      storageKey,
      originalFilename: rawFile.name,
      contentType: rawFile.type || "application/octet-stream",
      size: rawFile.size,
    })
  })
}
