import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string
      role?: "SUPERADMIN" | "ADMIN"
      first_name?: string
      last_name?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "SUPERADMIN" | "ADMIN"
  }
}
