import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"

import { loginThrottles } from "@/drizzle/schema"
import { db } from "@/lib/db/client"

export type ThrottleScope = "identifier" | "ip"

export interface LoginThrottleState {
  failCount: number
  windowStart: Date
  lockedUntil: Date | null
}

export interface LoginThrottleRepository {
  find(scope: ThrottleScope, key: string): Promise<LoginThrottleState | null>
  upsert(scope: ThrottleScope, key: string, state: LoginThrottleState): Promise<void>
  clear(scope: ThrottleScope, key: string): Promise<void>
}

export class DrizzleLoginThrottleRepository implements LoginThrottleRepository {
  async find(scope: ThrottleScope, key: string) {
    const [row] = await db
      .select()
      .from(loginThrottles)
      .where(and(eq(loginThrottles.scope, scope), eq(loginThrottles.key, key)))
      .limit(1)
    if (!row) return null
    return { failCount: row.failCount, windowStart: row.windowStart, lockedUntil: row.lockedUntil }
  }

  async upsert(scope: ThrottleScope, key: string, state: LoginThrottleState) {
    await db
      .insert(loginThrottles)
      .values({
        id: randomUUID(),
        scope,
        key,
        failCount: state.failCount,
        windowStart: state.windowStart,
        lockedUntil: state.lockedUntil,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [loginThrottles.scope, loginThrottles.key],
        set: {
          failCount: state.failCount,
          windowStart: state.windowStart,
          lockedUntil: state.lockedUntil,
          updatedAt: new Date(),
        },
      })
  }

  async clear(scope: ThrottleScope, key: string) {
    await db.delete(loginThrottles).where(and(eq(loginThrottles.scope, scope), eq(loginThrottles.key, key)))
  }
}

export const loginThrottleRepository = new DrizzleLoginThrottleRepository()
