import { PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { randomUUID } from "node:crypto"
import { z } from "zod"

import { requireRole } from "@/lib/api/auth-guard"
import { parseJsonWithSchema, withServerError } from "@/lib/api/handlers"
import { fail, ok } from "@/lib/api/response"
import { R2_BUCKET_NAME, s3Client } from "@/lib/api/s3"

const presignSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1),
  folder: z.string().optional().default("general"),
})

export async function POST(request: Request) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { data, error } = await parseJsonWithSchema(request, presignSchema)
    if (error || !data) return error

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return fail("Cloudflare R2 is not configured. Attachments are currently disabled.", 503, "SERVICE_UNAVAILABLE")
    }

    const fileExtension = data.filename.split(".").pop()
    const uniqueFilename = `${randomUUID()}.${fileExtension}`
    const storageKey = `${data.folder}/${uniqueFilename}`

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storageKey,
      ContentType: data.contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return ok({
      uploadUrl,
      storageKey,
      originalFilename: data.filename,
    })
  })
}
