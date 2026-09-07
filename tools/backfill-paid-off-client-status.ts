#!/usr/bin/env bun
/**
 * One-off backfill: marks clients inactive when none of their loans are
 * ACTIVE (i.e. fully paid off or defaulted) but `clients.isActive` is still
 * true from before `reconcileLoanAndClientStatus` (lib/db/repositories/
 * loan-status.repository.ts) existed. That function only runs as a side
 * effect of a payment write, so it never touched loans that were already
 * settled at deploy time — this script closes that gap for existing data.
 *
 * Idempotent — only touches clients where `isActive = true`, so re-running
 * finds zero eligible rows once everything's been backfilled.
 *
 * Run manually once against production data (not part of CI/deploy):
 *   bun tools/backfill-paid-off-client-status.ts --dry-run
 *   bun tools/backfill-paid-off-client-status.ts
 */
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm"

import { clients, loans } from "../drizzle/schema"
import { db } from "../lib/db/client"

const isDryRun = process.argv.includes("--dry-run")

async function main() {
  const clientsWithActiveLoan = db
    .select({ clientId: loans.clientId })
    .from(loans)
    .where(eq(loans.status, "ACTIVE"))

  const clientsWithAnyLoan = db.select({ clientId: loans.clientId }).from(loans)

  const eligible = await db
    .select({ id: clients.id, firstName: clients.firstName, lastName: clients.lastName })
    .from(clients)
    .where(
      and(
        eq(clients.isActive, true),
        isNull(clients.deletedAt),
        inArray(clients.id, clientsWithAnyLoan),
        notInArray(clients.id, clientsWithActiveLoan),
      ),
    )

  if (eligible.length === 0) {
    console.log("No clients need backfilling. Nothing to do.")
    return
  }

  console.log(`${eligible.length} client(s) eligible to be marked inactive (no ACTIVE loans remaining).`)

  if (isDryRun) {
    console.log("Dry run — no updates will be made. Eligible clients:")
    for (const client of eligible) {
      console.log(`  - ${client.firstName} ${client.lastName} (${client.id})`)
    }
    return
  }

  const result = await db
    .update(clients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(inArray(clients.id, eligible.map((c) => c.id)))
    .returning({ id: clients.id })

  console.log(`✓ Marked ${result.length} client(s) inactive.`)
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error)
    process.exitCode = 1
  })
  .finally(() => process.exit())
