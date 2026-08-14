import { and, eq, ne } from "drizzle-orm"

import { clients, loans } from "@/drizzle/schema"
import { db } from "@/lib/db/client"

type DbExecutor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * After any change to a loan's outstanding balance, keep loans.status and
 * clients.isActive in sync: a loan auto-completes at zero balance and
 * reverts if a payment edit/removal pushes it back above zero. A client is
 * auto-marked inactive only once none of their loans are ACTIVE, and is only
 * auto-reactivated if they were never explicitly deactivated (deletedAt is
 * still null) — an explicit deactivation is never overridden automatically.
 */
export async function reconcileLoanAndClientStatus(loanId: string, executor: DbExecutor = db) {
  const [loan] = await executor
    .select({ id: loans.id, status: loans.status, outstandingBalance: loans.outstandingBalance, clientId: loans.clientId })
    .from(loans)
    .where(eq(loans.id, loanId))
    .limit(1)
  if (!loan) return

  const balance = Number(loan.outstandingBalance)

  if (loan.status === "ACTIVE" && balance <= 0) {
    await executor.update(loans).set({ status: "COMPLETED", updatedAt: new Date() }).where(eq(loans.id, loanId))
  } else if (loan.status === "COMPLETED" && balance > 0) {
    await executor.update(loans).set({ status: "ACTIVE", updatedAt: new Date() }).where(eq(loans.id, loanId))
  }

  const clientLoans = await executor
    .select({ status: loans.status })
    .from(loans)
    .where(and(eq(loans.clientId, loan.clientId), ne(loans.id, loanId)))

  const finalStatus =
    balance <= 0 && loan.status !== "DEFAULTED"
      ? "COMPLETED"
      : balance > 0 && loan.status === "COMPLETED"
        ? "ACTIVE"
        : loan.status
  const hasActiveLoan = finalStatus === "ACTIVE" || clientLoans.some((l) => l.status === "ACTIVE")

  const [client] = await executor
    .select({ isActive: clients.isActive, deletedAt: clients.deletedAt })
    .from(clients)
    .where(eq(clients.id, loan.clientId))
    .limit(1)
  if (!client) return

  if (!hasActiveLoan && client.isActive) {
    await executor.update(clients).set({ isActive: false, updatedAt: new Date() }).where(eq(clients.id, loan.clientId))
  } else if (hasActiveLoan && !client.isActive && !client.deletedAt) {
    await executor.update(clients).set({ isActive: true, updatedAt: new Date() }).where(eq(clients.id, loan.clientId))
  }
}
