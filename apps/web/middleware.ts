import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const token = await getToken({
    req: request,
    secret,
  })

  if (token) return NextResponse.next()

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/loans/:path*", "/investors/:path*", "/reports/:path*", "/settings/:path*"],
}
