import { randomUUID } from "node:crypto"

import { asc, desc, eq, sql } from "drizzle-orm"
import type { InferSelectModel } from "drizzle-orm"

import { loans, paymentSchedules, payments } from "@/drizzle/schema"
import { db } from "@/lib/db/client"

type Loan = InferSelectModel<typeof loans>
type Payment = InferSelectModel<typeof payments>
type PaymentSchedule = InferSelectModel<typeof paymentSchedules>

export interface LoanWithSchedules {
  loan: Loan
  payment_schedule: Pick<
    PaymentSchedule,
    "id" | "dueDate" | "amountDue" | "principalDue" | "interestDue" | "isPaid" | "paidAt"
  >[]
}

export interface LoansRepository {
  findByClientId(clientId: string): Promise<Loan[]>
  findByIdWithSchedules(loanId: string): Promise<LoanWithSchedules | null>
  createPaymentAndApplyBalance(input: {
    loanId: string
    amount: string
    recordedById: string
    paymentType?: "REGULAR" | "ADVANCE" | "PENALTY"
    paymentMethod?: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
    paymentScheduleId?: string
    penaltyReason?: string | null
    notes?: string | null
  }): Promise<Payment>
}

export class DrizzleLoansRepository implements LoansRepository {
  async findByClientId(clientId: string): Promise<Loan[]> {
    return db.select().from(loans).where(eq(loans.clientId, clientId)).orderBy(desc(loans.createdAt))
  }

  async findByIdWithSchedules(loanId: string): Promise<LoanWithSchedules | null> {
    const [loan] = await db.select().from(loans).where(eq(loans.id, loanId)).limit(1)
    if (!loan) {
      return null
    }

    const scheduleRows = await db
      .select({
        id: paymentSchedules.id,
        dueDate: paymentSchedules.dueDate,
        amountDue: paymentSchedules.amountDue,
        principalDue: paymentSchedules.principalDue,
        interestDue: paymentSchedules.interestDue,
        isPaid: paymentSchedules.isPaid,
        paidAt: paymentSchedules.paidAt,
      })
      .from(paymentSchedules)
      .where(eq(paymentSchedules.loanId, loanId))
      .orderBy(asc(paymentSchedules.termNumber))

    return {
      loan,
      payment_schedule: scheduleRows,
    }
  }

  async createPaymentAndApplyBalance(input: {
    loanId: string
    amount: string
    recordedById: string
    paymentType?: "REGULAR" | "ADVANCE" | "PENALTY"
    paymentMethod?: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
    paymentScheduleId?: string
    penaltyReason?: string | null
    notes?: string | null
  }): Promise<Payment> {
    return db.transaction(async (tx) => {
      const [loan] = await tx.select({ id: loans.id }).from(loans).where(eq(loans.id, input.loanId)).limit(1)

      if (!loan) {
        throw new Error(`Loan not found for id: ${input.loanId}`)
      }

      const [payment] = await tx
        .insert(payments)
        .values({
          id: randomUUID(),
          loanId: input.loanId,
          paymentScheduleId: input.paymentScheduleId,
          amount: input.amount,
          paymentType: input.paymentType ?? "REGULAR",
          paymentMethod: input.paymentMethod ?? "CASH",
          penaltyReason: input.penaltyReason ?? null,
          notes: input.notes ?? null,
          recordedById: input.recordedById,
        })
        .returning()

      await tx
        .update(loans)
        .set({
          totalPaid: sql`${loans.totalPaid} + ${input.amount}`,
          outstandingBalance: sql`${loans.outstandingBalance} - ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(loans.id, input.loanId))

      return payment
    })
  }
}
