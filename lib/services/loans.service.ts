import { z } from "zod"

import { DrizzleLoansRepository } from "@/lib/db/repositories/loans.repository"

const recordPaymentSchema = z.object({
  loanId: z.string().min(1),
  amount: z.union([z.number().positive(), z.string().trim().min(1)]),
  recordedById: z.string().min(1),
  paymentType: z.enum(["REGULAR", "ADVANCE", "PENALTY"]).optional(),
  paymentMethod: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"]).optional(),
  paymentScheduleId: z.string().min(1).optional(),
  penaltyReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

function toMoneyString(value: number | string): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error("Payment amount must be a positive finite number.")
    }

    return value.toFixed(2)
  }

  const normalized = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(normalized) || Number(normalized) <= 0) {
    throw new Error("Payment amount must be a positive decimal with up to 2 decimal places.")
  }

  return normalized
}

export class LoansService {
  constructor(private readonly loansRepository = new DrizzleLoansRepository()) {}

  async listLoansByClient(clientId: string) {
    return this.loansRepository.findByClientId(clientId)
  }

  async getLoanWithSchedule(loanId: string) {
    return this.loansRepository.findByIdWithSchedules(loanId)
  }

  async recordPayment(input: z.input<typeof recordPaymentSchema>) {
    const parsed = recordPaymentSchema.parse(input)
    const amount = toMoneyString(parsed.amount)

    return this.loansRepository.createPaymentAndApplyBalance({
      loanId: parsed.loanId,
      amount,
      recordedById: parsed.recordedById,
      paymentType: parsed.paymentType,
      paymentMethod: parsed.paymentMethod,
      paymentScheduleId: parsed.paymentScheduleId,
      penaltyReason: parsed.penaltyReason ?? null,
      notes: parsed.notes ?? null,
    })
  }
}

export const loansService = new LoansService()
