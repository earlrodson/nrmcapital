"use client"

import { useMemo, useState } from "react"
import { ArrowLeft, Calculator } from "lucide-react"
import { CONFIG } from "@/lib/config"

const { LOAN_LIMITS, INTEREST_RATE_TIERS, DEFAULT_SETTINGS } = CONFIG

const PAYMENT_FREQUENCIES = [
  { label: "Monthly", value: CONFIG.PAYMENT_FREQUENCIES.MONTHLY, termsPerMonth: 1 },
  { label: "Semi-monthly", value: CONFIG.PAYMENT_FREQUENCIES.SEMI_MONTHLY, termsPerMonth: 2 },
  { label: "Weekly", value: CONFIG.PAYMENT_FREQUENCIES.WEEKLY, termsPerMonth: 4 },
] as const

type Frequency = (typeof PAYMENT_FREQUENCIES)[number]["value"]

function getMonthlyRate(months: number): number {
  const tier = INTEREST_RATE_TIERS.find(t => months >= t.min && months <= t.max)
  if (tier) return tier.rate
  throw new Error(`Invalid term: ${months} months. Maximum is ${LOAN_LIMITS.MAX_TERM_MONTHS}.`)
}

function getRateTier(months: number) {
  const tier = INTEREST_RATE_TIERS.find(t => months >= t.min && months <= t.max)
  if (tier) return { label: tier.label, rangeLabel: `${tier.min}-${tier.max} months` }
  throw new Error(`Invalid term: ${months} months. Maximum is ${LOAN_LIMITS.MAX_TERM_MONTHS}.`)
}

function clampTerm(value: number) {
  if (Number.isNaN(value)) return LOAN_LIMITS.MIN_TERM_MONTHS
  return Math.min(LOAN_LIMITS.MAX_TERM_MONTHS, Math.max(LOAN_LIMITS.MIN_TERM_MONTHS, Math.trunc(value)))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat(DEFAULT_SETTINGS.LOCALE, {
    style: "currency",
    currency: DEFAULT_SETTINGS.CURRENCY_CODE,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function LoanEstimator() {
  const [step, setStep] = useState<1 | 2>(1)
  const [principal, setPrincipal] = useState(20000)
  const [term, setTerm] = useState(6)
  const [frequency, setFrequency] = useState<Frequency>(CONFIG.PAYMENT_FREQUENCIES.SEMI_MONTHLY)

  const selectedFrequency = PAYMENT_FREQUENCIES.find((item) => item.value === frequency) ?? PAYMENT_FREQUENCIES[1]

  const estimate = useMemo(() => {
    const monthlyRate = getMonthlyRate(term)
    const estimatedInterest = principal * (monthlyRate / 100)
    const totalInterest = estimatedInterest * term
    const totalPayable = principal + totalInterest
    const totalTerms = term * selectedFrequency.termsPerMonth
    const installmentAmount = totalPayable / totalTerms
    const rateTier = getRateTier(term)

    return {
      monthlyRate,
      rateTier,
      estimatedInterest,
      totalInterest,
      totalPayable,
      totalTerms,
      installmentAmount,
    }
  }, [principal, term, selectedFrequency.termsPerMonth])

  return (
    <section className="glass-panel mb-14 w-full max-w-md rounded-[2rem] p-5 shadow-2xl sm:mb-16 sm:p-6 md:p-8 border border-white/50 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute -left-[20%] -top-[20%] h-64 w-64 rounded-full bg-emerald-200/20 blur-[80px] pointer-events-none"></div>
      <h3 className="mb-2 text-center text-lg font-bold tracking-tight text-slate-800 sm:text-xl relative z-10 uppercase">Instant Payment Estimator</h3>
      <p className="mb-6 text-center text-sm leading-relaxed text-slate-600">
        Monthly rates are auto-assigned by selected term using NRM&apos;s approved tier matrix.
      </p>

      {step === 1 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <label htmlFor="amount-slider" className="text-sm font-semibold uppercase text-slate-600">
                Loan Amount
              </label>
              <span className="glass-panel-strong rounded-xl px-4 py-1 text-lg font-bold text-slate-800 sm:text-xl">
                {formatCurrency(principal).replace(".00", "")}
              </span>
            </div>
            <input
              id="amount-slider"
              type="range"
              min={LOAN_LIMITS.MIN_AMOUNT}
              max={LOAN_LIMITS.MAX_AMOUNT}
              step={LOAN_LIMITS.STEP_AMOUNT}
              value={principal}
              onChange={(event) => setPrincipal(Number(event.target.value))}
              className="loan-range mb-3 w-full"
              aria-label="Loan amount slider"
            />
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>{formatCurrency(LOAN_LIMITS.MIN_AMOUNT).replace(".00", "")}</span>
              <span>{formatCurrency(LOAN_LIMITS.MAX_AMOUNT).replace(".00", "")}</span>
            </div>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase text-slate-600">Loan Term</p>
              <p className="text-sm text-slate-500">
                {term} month
                {term === 1 ? "" : "s"}
              </p>
            </div>
            <div className="glass-panel-strong rounded-xl p-3 sm:p-4">
              <div className="mb-3 flex items-center gap-3">
                <input
                  id="term-slider"
                  type="range"
                  min={LOAN_LIMITS.MIN_TERM_MONTHS}
                  max={LOAN_LIMITS.MAX_TERM_MONTHS}
                  step={1}
                  value={term}
                  onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
                  className="loan-range w-full accent-emerald-600"
                  aria-label="Loan term in months"
                />
                <input
                  type="number"
                  min={LOAN_LIMITS.MIN_TERM_MONTHS}
                  max={LOAN_LIMITS.MAX_TERM_MONTHS}
                  value={term}
                  onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
                  className="w-20 rounded-lg border border-slate-300 bg-white/95 px-2 py-1.5 text-right text-sm font-semibold text-slate-700"
                  aria-label="Loan term number input"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>{LOAN_LIMITS.MIN_TERM_MONTHS} month</span>
                <span>{LOAN_LIMITS.MAX_TERM_MONTHS} months</span>
              </div>
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/85 px-3 py-2 text-sm text-emerald-800">
                <p className="font-semibold">{estimate.rateTier.label}</p>
                <p>Applicable range: {estimate.rateTier.rangeLabel}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold uppercase text-slate-600">Payment Frequency</p>
              <p className="text-sm text-slate-500">installments</p>
            </div>
            <div className="glass-panel-strong flex gap-1 rounded-xl p-1.5" role="radiogroup" aria-label="Payment frequency options">
              {PAYMENT_FREQUENCIES.map((item) => {
                const active = item.value === frequency
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setFrequency(item.value)}
                    className={`swift-transition min-h-11 flex-1 rounded-lg px-2 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 active:scale-[0.99] ${
                      active ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600"
                    }`}
                  >
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.98]"
          >
            <Calculator className="h-5 w-5" />
            Calculate Estimate
          </button>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700">MONTHLY INTEREST RATE</p>
              <p className="text-xs text-slate-500">{estimate.rateTier.rangeLabel}</p>
            </div>
            <p className="text-xl font-bold text-slate-800">{estimate.monthlyRate.toFixed(2)}%</p>
          </div>

          <div className="glass-panel-strong mb-6 rounded-2xl p-5 text-center sm:p-6">
            <p className="mb-2 text-sm font-bold text-slate-800">ESTIMATED {selectedFrequency.label.toUpperCase()} PAYMENT:</p>
            <p className="text-4xl font-extrabold tracking-tight text-emerald-600 sm:text-5xl">{formatCurrency(estimate.installmentAmount)}</p>
            <p className="mt-3 text-xs text-slate-500">Estimated for {estimate.totalTerms} total installments.</p>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-3 text-left text-sm sm:grid-cols-2">
            <div className="glass-panel-strong rounded-lg p-3">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Est. interest per month</p>
              <p className="font-semibold text-slate-800">{formatCurrency(estimate.estimatedInterest)}</p>
            </div>
            <div className="glass-panel-strong rounded-lg p-3">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Total interest</p>
              <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalInterest)}</p>
            </div>
            <div className="glass-panel-strong rounded-lg p-3 sm:col-span-2">
              <p className="text-slate-500 uppercase text-[10px] font-bold">Total payable amount</p>
              <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalPayable)}</p>
            </div>
          </div>

          <p className="mb-6 text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
            Estimates are for reference only. Final approval remains subject to NRM credit evaluation.
          </p>

          <button
            onClick={() => setStep(1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white/50 px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-white hover:text-slate-900 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 active:scale-[0.98]"
          >
            <ArrowLeft className="h-4 w-4" />
            Recalculate
          </button>
        </div>
      )}
    </section>
  )
}
