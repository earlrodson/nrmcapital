import { NextResponse } from "next/server"

export interface ApiMeta {
  page?: number
  pageSize?: number
  total?: number
}

export function ok<T>(data: T, meta?: ApiMeta, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      meta,
      error: null,
    },
    { status },
  )
}

export function fail(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      meta: null,
      error: {
        code,
        message,
        details: details ?? null,
      },
    },
    { status },
  )
}
