import { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string
      role: "SUPERADMIN" | "ADMIN"
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "SUPERADMIN" | "ADMIN"
  }
}
