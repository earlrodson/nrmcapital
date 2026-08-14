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
      snapshot:  `bun tools/snapshot.ts`,
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

// Finds the index of the '{' that closes the one opened at openIndex, respecting nesting.
function findMatchingBrace(source: string, openIndex: number): number {
  let depth = 1
  for (let i = openIndex + 1; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') { depth--; if (depth === 0) return i }
  }
  return -1
}

// Splits a column-object body into top-level `key: value` segments, ignoring
// commas inside nested {}/()/[] (e.g. `.references(() => x.id, { onDelete: ... })`).
function splitTopLevel(body: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '{' || ch === '(' || ch === '[') depth++
    else if (ch === '}' || ch === ')' || ch === ']') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i))
      start = i + 1
    }
  }
  parts.push(body.slice(start))
  return parts
}

function extractDrizzleSchema(files: string[]) {
  const tables: Record<string, { columns: string[]; dialect: string }> = {}

  for (const file of files) {
    const source = readFile(file)
    // Match: export const tableName = pgTable('sql_name', { ...columns object opens here
    const declRe = /export const (\w+)\s*=\s*(pgTable|mysqlTable|sqliteTable|pgView|mysqlView)\(\s*['"]([^'"]+)['"]\s*,\s*\{/g
    let m: RegExpExecArray | null
    while ((m = declRe.exec(source)) !== null) {
      const [, exportName, fn] = m
      const dialect = fn.startsWith('pg') ? 'postgresql' : fn.startsWith('mysql') ? 'mysql' : 'sqlite'
      const openIndex = declRe.lastIndex - 1
      const closeIndex = findMatchingBrace(source, openIndex)
      if (closeIndex === -1) continue
      const body = source.slice(openIndex + 1, closeIndex)
      const columns = splitTopLevel(body)
        .map(seg => seg.trim().match(/^(\w+)\s*:/)?.[1])
        .filter((c): c is string => Boolean(c))
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

function envVars(): string[] {
  const example = readFile(join(ROOT, '.env.example'))
  return example
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => line.split('=')[0])
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
  env: {
    required_vars: envVars(),
    source: '.env.example',
    notes: ['Single .env file, no dev/staging/prod split. Never commit real values.'],
  },
}

writeFileSync(OUT, JSON.stringify(snapshot, null, 2))
console.log(`✓ Drizzle snapshot — ${Object.keys(tables).length} tables · ${schemaFiles.length} schema files → ${OUT}`)
