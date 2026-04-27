import { randomUUID } from "node:crypto"
import { eq, count, desc } from "drizzle-orm"
import { users } from "@/drizzle/schema"
import { db } from "@/lib/db/client"

export interface UsersRepository {
  findByEmail(email: string): Promise<typeof users.$inferSelect | null>
  findById(userId: string): Promise<typeof users.$inferSelect | null>
  touchLastLogin(userId: string): Promise<void>
  createUser(input: {
    email: string
    passwordHash: string
    name: string
    role?: "SUPERADMIN" | "ADMIN" | "CLIENT"
  }): Promise<typeof users.$inferSelect>
  updateUser(userId: string, input: Partial<Omit<typeof users.$inferInsert, "id" | "createdAt">>): Promise<typeof users.$inferSelect | null>
  listUsers(input: { page: number; pageSize: number }): Promise<{
    rows: Array<{
      id: string
      email: string
      name: string
      role: "SUPERADMIN" | "ADMIN" | "CLIENT"
      isActive: boolean
      lastLoginAt: Date | null
      createdAt: Date
    }>
    total: number
  }>
}

export class DrizzleUsersRepository implements UsersRepository {
  async findByEmail(email: string) {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return row ?? null
  }

  async findById(userId: string) {
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return row ?? null
  }

  async touchLastLogin(userId: string) {
    await db.update(users).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId))
  }

  async createUser(input: {
    email: string
    passwordHash: string
    name: string
    role?: "SUPERADMIN" | "ADMIN" | "CLIENT"
  }) {
    const [row] = await db
      .insert(users)
      .values({
        id: randomUUID(),
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: input.role ?? "ADMIN",
        updatedAt: new Date(),
      })
      .returning()
    return row
  }

  async updateUser(userId: string, input: Partial<Omit<typeof users.$inferInsert, "id" | "createdAt">>) {
    const [row] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning()
    return row ?? null
  }

  async listUsers(input: { page: number; pageSize: number }) {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize)
    const [totalRow] = await db.select({ total: count() }).from(users)
    return { rows, total: totalRow?.total ?? 0 }
  }
}

export const usersRepository = new DrizzleUsersRepository()
