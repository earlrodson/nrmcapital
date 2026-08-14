import { describe, expect, it } from "vitest"

import {
  createLoanSchema,
  createPaymentSchema,
  loginSchema,
  removePaymentSchema,
  reviewLoanApplicationSchema,
  updatePaymentSchema,
} from "./api"

describe("loginSchema", () => {
  it("accepts an email-shaped identifier", () => {
    expect(loginSchema.safeParse({ identifier: "admin@nrmcapital.com", password: "secret" }).success).toBe(true)
  })

  it("accepts a client-ID-shaped identifier (non-email string)", () => {
    expect(loginSchema.safeParse({ identifier: "d80acf15-a1a2-4a7d-a9c4-ec576f9c9aab", password: "secret" }).success).toBe(true)
  })

  it("rejects an empty identifier", () => {
    expect(loginSchema.safeParse({ identifier: "", password: "secret" }).success).toBe(false)
  })

  it("rejects an empty password", () => {
    expect(loginSchema.safeParse({ identifier: "admin@nrmcapital.com", password: "" }).success).toBe(false)
  })

  it("rejects a missing identifier", () => {
    expect(loginSchema.safeParse({ password: "secret" }).success).toBe(false)
  })
})

const baseLoan = {
  clientId: "client-1",
  loanType: "FLAT" as const,
  principalAmount: 10000,
  monthlyInterestRate: 2,
  months: 6,
  termsPerMonth: 1,
  paymentFrequency: "MONTHLY" as const,
  loanDate: new Date("2026-01-01"),
  createdById: "user-1",
}

describe("createLoanSchema", () => {
  it("accepts a valid loan payload", () => {
    expect(createLoanSchema.safeParse(baseLoan).success).toBe(true)
  })

  it("rejects a non-positive principal amount", () => {
    const result = createLoanSchema.safeParse({ ...baseLoan, principalAmount: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects a non-integer months value", () => {
    const result = createLoanSchema.safeParse({ ...baseLoan, months: 1.5 })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid loanType", () => {
    const result = createLoanSchema.safeParse({ ...baseLoan, loanType: "INTEREST_ONLY" })
    expect(result.success).toBe(false)
  })

  it("coerces a string loanDate into a Date", () => {
    const result = createLoanSchema.safeParse({ ...baseLoan, loanDate: "2026-02-01" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.loanDate).toBeInstanceOf(Date)
    }
  })
})

describe("createPaymentSchema", () => {
  it("accepts a numeric or string amount", () => {
    expect(createPaymentSchema.safeParse({ loanId: "loan-1", amount: 500 }).success).toBe(true)
    expect(createPaymentSchema.safeParse({ loanId: "loan-1", amount: "500.25" }).success).toBe(true)
  })

  it("rejects a missing loanId", () => {
    expect(createPaymentSchema.safeParse({ amount: 500 }).success).toBe(false)
  })

  it("rejects a non-positive numeric amount", () => {
    expect(createPaymentSchema.safeParse({ loanId: "loan-1", amount: -5 }).success).toBe(false)
    expect(createPaymentSchema.safeParse({ loanId: "loan-1", amount: 0 }).success).toBe(false)
  })
})

describe("updatePaymentSchema", () => {
  const base = {
    paymentId: "payment-1",
    amount: "500.00",
    paymentType: "REGULAR" as const,
    paymentMethod: "CASH" as const,
    paymentDate: new Date("2026-01-15"),
  }

  it("accepts a REGULAR payment without a penalty reason", () => {
    expect(updatePaymentSchema.safeParse(base).success).toBe(true)
  })

  it("requires a non-empty penaltyReason when paymentType is PENALTY", () => {
    const result = updatePaymentSchema.safeParse({ ...base, paymentType: "PENALTY" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["penaltyReason"])
    }
  })

  it("rejects a PENALTY payment whose reason is only whitespace", () => {
    const result = updatePaymentSchema.safeParse({
      ...base,
      paymentType: "PENALTY",
      penaltyReason: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a PENALTY payment with a trimmed non-empty reason", () => {
    const result = updatePaymentSchema.safeParse({
      ...base,
      paymentType: "PENALTY",
      penaltyReason: "Late fee",
    })
    expect(result.success).toBe(true)
  })
})

describe("removePaymentSchema", () => {
  it("requires a reason of at least 3 characters", () => {
    expect(removePaymentSchema.safeParse({ paymentId: "p1", reason: "ok" }).success).toBe(false)
    expect(removePaymentSchema.safeParse({ paymentId: "p1", reason: "duplicate entry" }).success).toBe(true)
  })

  it("rejects a reason that is only whitespace padding under the minimum", () => {
    const result = removePaymentSchema.safeParse({ paymentId: "p1", reason: "  a " })
    expect(result.success).toBe(false)
  })
})

describe("reviewLoanApplicationSchema", () => {
  it("accepts an APPROVED decision without a rejection reason", () => {
    expect(reviewLoanApplicationSchema.safeParse({ decision: "APPROVED" }).success).toBe(true)
  })

  it("requires a rejectionReason when decision is REJECTED", () => {
    expect(reviewLoanApplicationSchema.safeParse({ decision: "REJECTED" }).success).toBe(false)
    expect(
      reviewLoanApplicationSchema.safeParse({ decision: "REJECTED", rejectionReason: "Incomplete docs" }).success,
    ).toBe(true)
  })
})
