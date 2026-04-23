import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { requireRole } from "@/lib/api/auth-guard"
import { withServerError } from "@/lib/api/handlers"
import { ok, fail } from "@/lib/api/response"
import { R2_BUCKET_NAME, s3Client } from "@/lib/api/s3"
import { db } from "@/lib/db/client"
import { attachments } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Params) {
  return withServerError(async () => {
    const auth = await requireRole(["ADMIN", "SUPERADMIN"])
    if (auth.error) return auth.error

    const { id } = await params

    // 1. Fetch attachment record from DB to get storageKey
    const [row] = await db
      .select()
      .from(attachments)
      .where(eq(attachments.id, id))
      .limit(1)

    if (!row) {
      return fail("Attachment not found.", 404, "NOT_FOUND")
    }

    if (!process.env.R2_ACCOUNT_ID || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
      return fail("Cloudflare R2 is not configured.", 503, "SERVICE_UNAVAILABLE")
    }

    // 2. Generate presigned GET URL
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: row.storageKey,
    })

    const viewUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    return ok({
      viewUrl,
      fileName: row.fileName,
      contentType: row.type,
    })
  })
}
