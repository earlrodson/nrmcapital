#!/usr/bin/env bun
/**
 * One-off backfill: provisions CLIENT portal accounts for existing clients
 * that don't have one yet. Idempotent — only touches clients where
 * `user_id IS NULL`, so re-running skips everything already provisioned.
 *
 * Run manually once against production data (not part of CI/deploy):
 *   bun tools/backfill-client-accounts.ts --dry-run
 *   bun tools/backfill-client-accounts.ts
 */
import { existsSync, mkdirSync, writeFileSync } from "fs"
import { join } from "path"
import { isNull } from "drizzle-orm"

import { clients } from "../drizzle/schema"
import { db } from "../lib/db/client"
import { provisionClientPortalAccount } from "../lib/services/client-portal-provisioning"

const ROOT = join(import.meta.dir, "..")
const OUTPUT_DIR = join(ROOT, "tools", "output")
const isDryRun = process.argv.includes("--dry-run")

async function main() {
  const eligible = await db
    .select({ id: clients.id, firstName: clients.firstName, lastName: clients.lastName, contactNumber: clients.contactNumber })
    .from(clients)
    .where(isNull(clients.userId))

  if (eligible.length === 0) {
    console.log("No clients need portal accounts. Nothing to do.")
    return
  }

  console.log(`${eligible.length} client(s) eligible for portal account provisioning.`)

  if (isDryRun) {
    console.log("Dry run — no accounts will be created. Eligible clients:")
    for (const client of eligible) {
      console.log(`  - ${client.firstName} ${client.lastName} (${client.id})`)
    }
    return
  }

  const rows: Array<{ clientId: string; name: string; loginId: string; password: string; contactNumber: string | null }> = []
  let failureCount = 0

  for (const client of eligible) {
    try {
      const result = await provisionClientPortalAccount(client.id)
      rows.push({
        clientId: client.id,
        name: `${client.firstName} ${client.lastName}`,
        loginId: result.loginId,
        password: result.password,
        contactNumber: client.contactNumber,
      })
    } catch (error) {
      failureCount += 1
      console.error(
        `  ✗ Failed to provision ${client.firstName} ${client.lastName} (${client.id}):`,
        error instanceof Error ? error.message : error,
      )
    }
  }

  if (rows.length === 0) {
    console.log("No accounts were created.")
    return
  }

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const csvPath = join(OUTPUT_DIR, `client-portal-backfill-${stamp}.csv`)
  const jsonPath = join(OUTPUT_DIR, `client-portal-backfill-${stamp}.json`)

  const csvLines = [
    "name,login_id,password",
    ...rows.map((row) => `"${row.name.replace(/"/g, '""')}",${row.loginId},${row.password}`),
  ]
  writeFileSync(csvPath, csvLines.join("\n"), { mode: 0o600 })

  // One record per client, `delivered: false` so a send-one-by-one script/checklist
  // can flip it to true as each client is handed their credentials.
  const jsonRecords = rows.map((row) => ({
    clientId: row.clientId,
    name: row.name,
    loginId: row.loginId,
    password: row.password,
    contactNumber: row.contactNumber,
    delivered: false,
  }))
  writeFileSync(jsonPath, JSON.stringify(jsonRecords, null, 2), { mode: 0o600 })

  console.log(`✓ Provisioned ${rows.length} account(s)${failureCount ? `, ${failureCount} failure(s)` : ""}.`)
  console.log(`  Credentials written to:`)
  console.log(`    ${csvPath}`)
  console.log(`    ${jsonPath}`)
  console.log(`  Both gitignored, mode 0600 — hand out to clients and delete when done.`)
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exitCode = 1
  })
  .finally(() => process.exit())
