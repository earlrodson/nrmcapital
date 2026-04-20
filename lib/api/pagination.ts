import { z } from "zod"

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
})

export interface PaginationInput {
  page: number
  pageSize: number
  offset: number
}

export function parsePagination(searchParams: URLSearchParams): PaginationInput {
  const parsed = paginationSchema.parse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  })

  return {
    ...parsed,
    offset: (parsed.page - 1) * parsed.pageSize,
  }
}
