import postgres from "postgres"
import { z } from "zod"

const paymentEventSnapshotSchema = z.object({
  paymentId: z.string().min(1),
  loanId: z.string().min(1),
  amount: z.string(),
  paymentType: z.enum(["REGULAR", "ADVANCE", "PENALTY"]),
  paymentMethod: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"]),
  paymentScheduleId: z.string().nullable(),
  paymentDate: z.string(),
  penaltyReason: z.string().nullable(),
  notes: z.string().nullable(),
  deletedAt: z.string().nullable(),
  deletedById: z.string().nullable(),
  deleteReason: z.string().nullable(),
})

function getSqlClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database-backed E2E assertions.")
  }
  return postgres(connectionString, { max: 1 })
}

export async function getAnyActiveLoanId() {
  const sql = getSqlClient()
  try {
    const rows = await sql<{ id: string }[]>`
      select id
      from loans
      where status = 'ACTIVE'
      order by created_at desc
      limit 1
    `
    return rows[0]?.id ?? null
  } finally {
    await sql.end()
  }
}

export async function getPaymentByNotes(notes: string) {
  const sql = getSqlClient()
  try {
    const rows = await sql<
      {
        id: string
        loan_id: string
        deleted_at: string | null
        deleted_by_id: string | null
        delete_reason: string | null
        amount: string
      }[]
    >`
      select id, loan_id, deleted_at, deleted_by_id, delete_reason, amount
      from payments
      where notes = ${notes}
      order by payment_date desc
      limit 1
    `
    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}

export async function getPaymentEvents(paymentId: string) {
  const sql = getSqlClient()
  try {
    const rows = await sql<
      {
        event_type: "CREATED" | "UPDATED" | "SOFT_DELETED"
        before: unknown
        after: unknown
      }[]
    >`
      select event_type, "before", "after"
      from payment_events
      where payment_id = ${paymentId}
      order by created_at asc
    `
    return rows.map((row) => ({
      eventType: row.event_type,
      before: row.before ? paymentEventSnapshotSchema.parse(row.before) : null,
      after: row.after ? paymentEventSnapshotSchema.parse(row.after) : null,
    }))
  } finally {
    await sql.end()
  }
}

export async function getLatestAuditLogForPayment(paymentId: string, action: string) {
  const sql = getSqlClient()
  try {
    const rows = await sql<{ user_id: string; payload: unknown }[]>`
      select user_id, payload
      from audit_logs
      where entity = 'PAYMENT'
        and entity_id = ${paymentId}
        and action = ${action}
      order by created_at desc
      limit 1
    `
    return rows[0] ?? null
  } finally {
    await sql.end()
  }
}
