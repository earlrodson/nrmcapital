import { describe, expect, it } from "vitest"

import { calculateLoanTerms } from "./loan-calculations"

describe("calculateLoanTerms", () => {
  it("computes interest, payable, and per-term amounts", () => {
    const result = calculateLoanTerms({
      principalAmount: 100000,
      monthlyInterestRate: 3,
      months: 6,
      termsPerMonth: 1,
      loanDate: new Date("2026-01-15"),
    })

    expect(result.principalAmount).toBe("100000.00")
    expect(result.monthlyInterestRate).toBe("3.00")
    expect(result.totalTerms).toBe(6)
    expect(result.estimatedInterest).toBe("18000.00")
    expect(result.totalPayable).toBe("118000.00")
    expect(result.amortizationAmount).toBe("19666.67")
    expect(result.principalPerTerm).toBe("16666.67")
    expect(result.interestPerTerm).toBe("3000.00")
  })

  it("splits terms across multiple payments per month", () => {
    const result = calculateLoanTerms({
      principalAmount: 50000,
      monthlyInterestRate: 2,
      months: 3,
      termsPerMonth: 2,
      loanDate: new Date("2026-01-01"),
    })

    expect(result.totalTerms).toBe(6)
    expect(result.estimatedInterest).toBe("3000.00")
    expect(result.amortizationAmount).toBe("8833.33")
  })

  it("advances expectedEndDate by the loan term in months", () => {
    const result = calculateLoanTerms({
      principalAmount: 10000,
      monthlyInterestRate: 1,
      months: 12,
      termsPerMonth: 1,
      loanDate: new Date("2026-01-31"),
    })

    expect(result.expectedEndDate.getUTCFullYear()).toBe(2027)
  })

  it("handles string-typed numeric inputs precisely", () => {
    const result = calculateLoanTerms({
      principalAmount: "1234.56",
      monthlyInterestRate: "1.5",
      months: 1,
      termsPerMonth: 1,
      loanDate: new Date("2026-01-01"),
    })

    expect(result.estimatedInterest).toBe("18.52")
    expect(result.totalPayable).toBe("1253.08")
  })
})
