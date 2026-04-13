export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/loans/:path*", "/investors/:path*", "/reports/:path*", "/settings/:path*"],
}
