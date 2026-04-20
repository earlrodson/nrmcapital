import Decimal from "decimal.js"

interface LoanCalculationInput {
  principalAmount: number | string
  monthlyInterestRate: number | string
  months: number
  termsPerMonth: number
  loanDate: Date
}

export interface LoanCalculations {
  principalAmount: string
  monthlyInterestRate: string
  totalTerms: number
  estimatedInterest: string
  totalPayable: string
  amortizationAmount: string
  principalPerTerm: string
  interestPerTerm: string
  expectedEndDate: Date
}

export function calculateLoanTerms(input: LoanCalculationInput): LoanCalculations {
  const principal = new Decimal(input.principalAmount)
  const monthlyRate = new Decimal(input.monthlyInterestRate)
  const totalTerms = input.months * input.termsPerMonth

  const estimatedInterest = principal.mul(monthlyRate.div(100)).mul(input.months)
  const totalPayable = principal.add(estimatedInterest)
  const amortizationAmount = totalPayable.div(totalTerms)
  const principalPerTerm = principal.div(totalTerms)
  const interestPerTerm = estimatedInterest.div(totalTerms)

  const expectedEndDate = new Date(input.loanDate)
  expectedEndDate.setMonth(expectedEndDate.getMonth() + input.months)

  return {
    principalAmount: principal.toFixed(2),
    monthlyInterestRate: monthlyRate.toFixed(2),
    totalTerms,
    estimatedInterest: estimatedInterest.toFixed(2),
    totalPayable: totalPayable.toFixed(2),
    amortizationAmount: amortizationAmount.toFixed(2),
    principalPerTerm: principalPerTerm.toFixed(2),
    interestPerTerm: interestPerTerm.toFixed(2),
    expectedEndDate,
  }
}
