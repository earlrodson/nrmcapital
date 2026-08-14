import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

import { cookies } from "next/headers"

import { db } from "@/lib/db/client"
import { users } from "@/drizzle/schema"
import { eq } from "drizzle-orm"

export const SESSION_COOKIE = "nrm_session"
const ONE_DAY_SECONDS = 60 * 60 * 24
const SESSION_TTL_SECONDS = ONE_DAY_SECONDS * 7

export type SessionRole = "SUPERADMIN" | "ADMIN" | "CLIENT"

export interface SessionUser {
  userId: string
  role: SessionRole
  email: string
  name: string
}

interface SessionPayload {
  sid: string
  userId: string
  role: SessionRole
  exp: number
}

function getSecret() {
  return process.env.AUTH_SECRET ?? "nrm-dev-auth-secret"
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("hex")
}

function encode(payload: SessionPayload) {
  const json = JSON.stringify(payload)
  const body = Buffer.from(json).toString("base64url")
  const signature = sign(body)
  return `${body}.${signature}`
}

function decode(token: string): SessionPayload | null {
  const [body, signature] = token.split(".")
  if (!body || !signature) {
    return null
  }

  const expected = sign(body)
  if (signature.length !== expected.length) {
    return null
  }
  const matches = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  if (!matches) {
    return null
  }

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload
  if (payload.exp < Date.now()) {
    return null
  }

  return payload
}

export async function createSession(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user) {
    throw new Error("User not found.")
  }

  const payload: SessionPayload = {
    sid: randomUUID(),
    userId: user.id,
    role: user.role,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  }

  const token = encode(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  })

  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  } satisfies SessionUser
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" })
}

export async function getSessionUserFromToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) {
    return null
  }

  const payload = decode(token)
  if (!payload) {
    return null
  }

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
      isRestricted: users.isRestricted,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1)

  if (!user) {
    return null
  }
  // isRestricted is an absolute lockout: unlike isActive (which CLIENT accounts bypass
  // for read-only history access), a restricted user can never authenticate, regardless
  // of role or active status. This is the "even active" hard-block admins can flip on.
  if (user.isRestricted) {
    return null
  }
  // Deactivated CLIENT accounts keep read-only portal access so borrowers can still
  // view their loan/payment history after being marked inactive/deferred — the client
  // portal has no write surface, so this doesn't reopen any mutation capability.
  // Deactivated staff (ADMIN/SUPERADMIN) remain fully locked out.
  if (!user.isActive && user.role !== "CLIENT") {
    return null
  }

  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  return getSessionUserFromToken(cookieStore.get(SESSION_COOKIE)?.value)
}
