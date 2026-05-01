import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const createClientSchema = z.object({
  userId: z.string().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateClientSchema = createClientSchema.partial()

export const createClientAttachmentSchema = z.object({
  clientId: z.string().min(1),
  uploadedById: z.string().min(1),
  storageKey: z.string().min(1),
  type: z.enum(["GOV_ID", "PROOF_OF_INCOME", "PROOF_OF_BILLING", "CONTRACT", "OTHER"]).optional(),
  fileName: z.string().optional(),
})

export const createClientAttachmentsBatchSchema = z.array(createClientAttachmentSchema).max(50)

export const createLoanSchema = z.object({
  clientId: z.string().min(1),
  investorId: z.string().optional(),
  loanType: z.enum(["FLAT", "DIMINISHING"]),
  principalAmount: z.union([z.number().positive(), z.string().min(1)]),
  monthlyInterestRate: z.union([z.number().positive(), z.string().min(1)]),
  months: z.number().int().positive(),
  termsPerMonth: z.number().int().positive(),
  paymentFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "WEEKLY"]),
  loanDate: z.coerce.date(),
  disbursementDate: z.coerce.date().optional(),
  createdById: z.string().min(1),
  notes: z.string().optional(),
})

export const createLoanForNewClientSchema = createLoanSchema.omit({ clientId: true })

export const createLoanApplicationSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  applicantEmail: z.string().email(),
  contactNumber: z.string().optional(),
  address: z.string().optional(),
  principalAmount: z.union([z.number().positive(), z.string().min(1)]),
  monthlyInterestRate: z.union([z.number().positive(), z.string().min(1)]),
  months: z.number().int().positive(),
  termsPerMonth: z.number().int().positive(),
  paymentFrequency: z.enum(["MONTHLY", "SEMI_MONTHLY", "WEEKLY"]),
  notes: z.string().optional(),
})

export const reviewLoanApplicationSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("APPROVED"),
    notes: z.string().optional(),
  }),
  z.object({
    decision: z.literal("REJECTED"),
    rejectionReason: z.string().min(1),
  }),
])

export const updateLoanSchema = z.object({
  status: z.enum(["ACTIVE", "COMPLETED", "DEFAULTED"]).optional(),
  disbursementDate: z.coerce.date().nullable().optional(),
  actualEndDate: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const updatePaymentScheduleDueDateSchema = z.object({
  scheduleId: z.string().min(1),
  dueDate: z.coerce.date(),
})

export const createPaymentSchema = z.object({
  loanId: z.string().min(1),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  recordedById: z.string().min(1).optional(),
  paymentType: z.enum(["REGULAR", "ADVANCE", "PENALTY"]).optional(),
  paymentMethod: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"]).optional(),
  paymentScheduleId: z.string().optional(),
  penaltyReason: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
})

export const updatePaymentSchema = z
  .object({
    paymentId: z.string().min(1),
    amount: z.union([z.number().positive(), z.string().trim().min(1)]),
    paymentType: z.enum(["REGULAR", "ADVANCE", "PENALTY"]),
    paymentMethod: z.enum(["CASH", "GCASH", "BANK_TRANSFER", "OTHER"]),
    paymentScheduleId: z.string().min(1).nullable().optional(),
    paymentDate: z.coerce.date(),
    penaltyReason: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.paymentType === "PENALTY" && !value.penaltyReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["penaltyReason"],
        message: "Penalty reason is required for penalty payments.",
      })
    }
  })

export const removePaymentSchema = z.object({
  paymentId: z.string().min(1),
  reason: z.string().trim().min(3, "Reason is required."),
})

export const createInvestorSchema = z.object({
  name: z.string().min(1),
  capitalAmount: z.union([z.number(), z.string()]).optional(),
  interestShareRate: z.union([z.number(), z.string()]).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
})

export const updateInvestorSchema = createInvestorSchema.partial()

export const createFundingTransactionSchema = z.object({
  investorId: z.string().optional(),
  transactionType: z.enum(["DEPOSIT", "WITHDRAWAL"]),
  amount: z.union([z.number().positive(), z.string().min(1)]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  recordedById: z.string().min(1).optional(),
})

export const updateSystemSettingSchema = z.object({
  settingKey: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
  updatedById: z.string().optional(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(["SUPERADMIN", "ADMIN", "CLIENT"]).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["SUPERADMIN", "ADMIN", "CLIENT"]).optional(),
  isActive: z.boolean().optional(),
})

export const resetUserPasswordSchema = z.object({
  password: z.string().min(6),
})
