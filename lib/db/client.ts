import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

import * as schema from "@/drizzle/schema"
import type { DbProvider, DbRuntimeConfig } from "@/lib/db/types"

const DEFAULT_PROVIDER: DbProvider = "supabase"
const ALLOWED_PROVIDERS = new Set<DbProvider>(["supabase", "postgres"])

function debugLog(payload: {
  runId: string
  hypothesisId: string
  location: string
  message: string
  data: Record<string, unknown>
}) {
  // #region agent log
  fetch("http://127.0.0.1:7332/ingest/ee94bab0-1b23-40e2-9c3e-7953b5ef7ecc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "d833c9",
    },
    body: JSON.stringify({
      sessionId: "d833c9",
      ...payload,
      timestamp: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
}

function safeConnectionTag(rawUrl: string | undefined) {
  if (!rawUrl) return "missing"
  try {
    const parsed = new URL(rawUrl)
    const dbName = parsed.pathname.replace(/^\//, "") || "unknown_db"
    const port = parsed.port || "default"
    return `${parsed.protocol}//${parsed.hostname}:${port}/${dbName}`
  } catch {
    return "invalid-url"
  }
}

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
  dbConnectionTag?: string
}

const nextConnectionTag = safeConnectionTag(runtimeConfig.databaseUrl)
const hasCachedSqlClient = Boolean(globalForDb.sqlClient)
const cachedConnectionTag = globalForDb.dbConnectionTag ?? "unknown"

// #region agent log
debugLog({
  runId: "initial",
  hypothesisId: "H6",
  location: "lib/db/client.ts:init",
  message: "DB client module initializing",
  data: {
    provider: runtimeConfig.provider,
    hasCachedSqlClient,
    cachedConnectionTag,
    nextConnectionTag,
    nodeEnv: process.env.NODE_ENV ?? "unknown",
  },
})
// #endregion

const sqlClient = globalForDb.sqlClient
  ? globalForDb.sqlClient
  : postgres(runtimeConfig.databaseUrl, {
      max: 10,
      prepare: false,
    })

// #region agent log
debugLog({
  runId: "initial",
  hypothesisId: "H7",
  location: "lib/db/client.ts:client-choice",
  message: "DB client selected",
  data: {
    reusedCachedClient: hasCachedSqlClient,
    cachedConnectionTag,
    selectedConnectionTag: hasCachedSqlClient ? cachedConnectionTag : nextConnectionTag,
  },
})
// #endregion

export const db = globalForDb.db ?? drizzle(sqlClient, { schema })

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = sqlClient
  globalForDb.db = db
  globalForDb.dbConnectionTag = nextConnectionTag
}

export { runtimeConfig }
