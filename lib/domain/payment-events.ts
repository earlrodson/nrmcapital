import { z } from "zod"

export const paymentEventSnapshotSchema = z.object({
  paymentId: z.string().min(1),
  loanId: z.string().min(1),
  amount: z.string(),
  paymentType: z.enum(["REGULAR", "ADVANCE", "PENALTY"]),
  paymentMethod: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"]),
  paymentScheduleId: z.string().nullable(),
  paymentDate: z.date(),
  penaltyReason: z.string().nullable(),
  notes: z.string().nullable(),
  deletedAt: z.date().nullable(),
  deletedById: z.string().nullable(),
  deleteReason: z.string().nullable(),
})

export type PaymentEventSnapshot = z.infer<typeof paymentEventSnapshotSchema>
