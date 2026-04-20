import { ZodSchema } from "zod"

import { fail } from "@/lib/api/response"

export async function parseJsonWithSchema<T>(
  request: Request,
  schema: ZodSchema<T>,
): Promise<{ data?: T; error?: ReturnType<typeof fail> }> {
  try {
    const raw = await request.json()
    const data = schema.parse(raw)
    return { data }
  } catch (error) {
    return {
      error: fail("Invalid request payload.", 422, "VALIDATION_ERROR", {
        message: error instanceof Error ? error.message : "Unknown validation error",
      }),
    }
  }
}

export function withServerError<T>(fn: () => Promise<T>) {
  return fn().catch((error) => {
    return fail("Unexpected server error.", 500, "INTERNAL_ERROR", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  })
}
