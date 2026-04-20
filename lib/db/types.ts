export type DbProvider = "supabase" | "postgres"

export interface DbRuntimeConfig {
  provider: DbProvider
  databaseUrl: string
  directUrl?: string
}
