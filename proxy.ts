import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

function readRoleFromCookie(request: NextRequest): "SUPERADMIN" | "ADMIN" | "CLIENT" | null {
  const token = request.cookies.get("nrm_session")?.value
  if (!token) {
    return null
  }

  const [body] = token.split(".")
  if (!body) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { role?: string; exp?: number }
    if (!payload.role || !payload.exp || payload.exp < Date.now()) {
      return null
    }
    if (payload.role === "SUPERADMIN" || payload.role === "ADMIN" || payload.role === "CLIENT") {
      return payload.role
    }
    return null
  } catch {
    return null
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const role = readRoleFromCookie(request)

  if (pathname.startsWith("/admin")) {
    if (!role) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    if (role === "CLIENT") {
      return NextResponse.redirect(new URL("/client/dashboard", request.url))
    }
  }

  if (pathname.startsWith("/client") && !pathname.startsWith("/client/login")) {
    if (!role) {
      return NextResponse.redirect(new URL("/client/login", request.url))
    }
    if (role === "ADMIN" || role === "SUPERADMIN") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*"],
}
