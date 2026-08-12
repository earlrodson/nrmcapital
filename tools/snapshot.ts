#!/usr/bin/env bun
/**
 * Drizzle schema snapshot — parses drizzle/schema.ts into .claude/snapshot.json.
 * Run: bun tools/snapshot.ts
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dir, '..')
const OUT  = join(ROOT, '.claude', 'snapshot.json')

function readFile(p: string) { try { return readFileSync(p, 'utf-8') } catch { return '' } }

function extractStack() {
  const pkg = JSON.parse(readFile(join(ROOT, 'package.json')) || '{}')
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const pm = existsSync(join(ROOT, 'bun.lock'))    ? 'bun'
           : existsSync(join(ROOT, 'pnpm-lock.yaml')) ? 'pnpm'
           : existsSync(join(ROOT, 'yarn.lock'))   ? 'yarn' : 'npm'
  return {
    runtime: pm,
    framework: deps['next'] ? 'Next.js' : deps['vite'] ? 'Vite' : 'Node',
    orm: 'Drizzle ' + (deps['drizzle-orm'] ?? 'unknown'),
    commands: {
      dev:       `${pm} run dev`,
      generate:  `${pm} run db:generate`,
      migrate:   `${pm} run db:migrate`,
      push:      `${pm} run db:push`,
      studio:    `${pm} run db:studio`,
      snapshot:  `${pm} tools/snapshot.ts`,
    },
  }
}

// Detect schema files from drizzle.config.ts or common paths
function findSchemaFiles(): string[] {
  const config = readFile(join(ROOT, 'drizzle.config.ts')) || readFile(join(ROOT, 'drizzle.config.js'))
  const schemaMatch = config.match(/schema:\s*['"]([^'"]+)['"]/)
  if (schemaMatch) {
    const p = join(ROOT, schemaMatch[1])
    if (existsSync(p)) return [p]
  }
  const candidates = ['db/schema.ts', 'src/db/schema.ts', 'lib/db/schema.ts', 'drizzle/schema.ts']
  return candidates.filter(p => existsSync(join(ROOT, p))).map(p => join(ROOT, p))
}

function extractDrizzleSchema(files: string[]) {
  const tables: Record<string, { columns: string[]; dialect: string }> = {}

  for (const file of files) {
    const source = readFile(file)
    // Match: export const tableName = pgTable('sql_name', { ... })
    const tableRe = /export const (\w+)\s*=\s*(pgTable|mysqlTable|sqliteTable|pgView|mysqlView)\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g
    let m: RegExpExecArray | null
    while ((m = tableRe.exec(source)) !== null) {
      const [, exportName, fn,, body] = m
      const dialect = fn.startsWith('pg') ? 'postgresql' : fn.startsWith('mysql') ? 'mysql' : 'sqlite'
      const colRe = /^\s+(\w+)\s*:/gm
      const columns: string[] = []
      let c: RegExpExecArray | null
      while ((c = colRe.exec(body)) !== null) columns.push(c[1])
      tables[exportName] = { columns, dialect }
    }
  }
  return tables
}

function keyFiles() {
  const schemaFiles = findSchemaFiles()
  const candidates = {
    config:     ['drizzle.config.ts', 'drizzle.config.js'],
    schema:     schemaFiles.map(f => f.replace(ROOT + '/', '')),
    client:     ['lib/db.ts', 'src/lib/db.ts', 'db/index.ts', 'src/db/index.ts'],
    migrations: ['drizzle'],
  }
  const result: Record<string, string[]> = {}
  for (const [k, paths] of Object.entries(candidates))
    result[k] = paths.filter(p => existsSync(join(ROOT, p)))
  return result
}

const schemaFiles = findSchemaFiles()
const tables = extractDrizzleSchema(schemaFiles)
const snapshot = {
  generated_at: new Date().toISOString(),
  generated_by: 'tools/snapshot.ts',
  stack: extractStack(),
  db: {
    platform: 'drizzle',
    schema_files: schemaFiles.map(f => f.replace(ROOT + '/', '')),
    tables,
  },
  key_files: keyFiles(),
  env_map: {
    development: { DATABASE_URL: 'FILL_IN' },
    staging:     { DATABASE_URL: 'FILL_IN' },
    production:  { DATABASE_URL: 'FILL_IN' },
    notes: ['Never commit real DATABASE_URL values — use .env files'],
  },
}

writeFileSync(OUT, JSON.stringify(snapshot, null, 2))
console.log(`✓ Drizzle snapshot — ${Object.keys(tables).length} tables · ${schemaFiles.length} schema files → ${OUT}`)
