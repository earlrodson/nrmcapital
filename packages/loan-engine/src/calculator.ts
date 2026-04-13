import Decimal from "decimal.js"

export function getMonthlyRate(months: number): number {
  if (months >= 1 && months <= 6) return 7
  if (months >= 7 && months <= 9) return 6
  if (months >= 10 && months <= 12) return 5
  if (months >= 13 && months <= 15) return 4
  if (months >= 16 && months <= 17) return 3
  throw new Error(`Invalid term: ${months} months. Max is 17.`)
}

export interface FlatLoanResult {
  monthly_interest_rate: number
  monthly_interest: Decimal
  total_interest: Decimal
  total_payable: Decimal
  total_terms: number
  monthly_payment: Decimal
  semi_monthly_payment: Decimal
  weekly_payment: Decimal
}

export function computeFlatLoan(
  principal: number,
  months: number,
  terms_per_month: number,
): FlatLoanResult {
  const p = new Decimal(principal)
  const m = new Decimal(months)
  const rate = new Decimal(getMonthlyRate(months)).div(100)

  const monthly_interest = p.mul(rate)
  const total_interest = monthly_interest.mul(m)
  const total_payable = p.plus(total_interest)
  const total_terms = months * terms_per_month
  const monthly_payment = p.div(m).plus(monthly_interest)
  const semi_monthly_payment = monthly_payment.div(2)
  const weekly_payment = semi_monthly_payment.div(2)

  return {
    monthly_interest_rate: getMonthlyRate(months),
    monthly_interest,
    total_interest,
    total_payable,
    total_terms,
    monthly_payment,
    semi_monthly_payment,
    weekly_payment,
  }
}
