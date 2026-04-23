import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/drizzle/schema"
import type { DbProvider, DbRuntimeConfig } from "@/lib/db/types"

const DEFAULT_PROVIDER: DbProvider = "supabase"
const ALLOWED_PROVIDERS = new Set<DbProvider>(["supabase", "postgres"])

function parseProvider(value: string | undefined): DbProvider {
  if (!value) {
    return DEFAULT_PROVIDER
  }

  if (ALLOWED_PROVIDERS.has(value as DbProvider)) {
    return value as DbProvider
  }

  throw new Error(`Invalid DB_PROVIDER: "${value}". Expected "supabase" or "postgres".`)
}

function getRuntimeConfig(): DbRuntimeConfig {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database connection.")
  }

  return {
    provider: parseProvider(process.env.DB_PROVIDER),
    databaseUrl,
    directUrl: process.env.DIRECT_URL,
  }
}

const runtimeConfig = getRuntimeConfig()

const globalForDb = globalThis as unknown as {
  sqlClient?: postgres.Sql
  db?: ReturnType<typeof drizzle>
}

const sqlClient =
  globalForDb.sqlClient ??
  postgres(runtimeConfig.databaseUrl, {
    max: 10,
    prepare: false,
  })

export const db = globalForDb.db ?? drizzle(sqlClient, { schema })

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = sqlClient
  globalForDb.db = db
}

export { runtimeConfig }
