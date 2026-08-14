import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { SESSION_COOKIE, getSessionUserFromToken } from "@/lib/auth/session"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const user = await getSessionUserFromToken(token)

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    return NextResponse.redirect(loginUrl)
  }

  const isClientRoute = pathname.startsWith("/client")
  const isAdminRoute = pathname.startsWith("/admin")

  if (isClientRoute && user.role !== "CLIENT") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url))
  }

  if (isAdminRoute && user.role === "CLIENT") {
    return NextResponse.redirect(new URL("/client/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*"],
}
