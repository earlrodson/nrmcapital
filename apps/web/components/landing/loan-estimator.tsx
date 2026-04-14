"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

const MIN_AMOUNT = 5000
const MAX_AMOUNT = 500000
const STEP_AMOUNT = 5000
const MIN_TERM = 1
const MAX_TERM = 17
const PAYMENT_FREQUENCIES = [
  { label: "Monthly", value: "MONTHLY", termsPerMonth: 1 },
  { label: "Semi-monthly", value: "SEMI_MONTHLY", termsPerMonth: 2 },
  { label: "Weekly", value: "WEEKLY", termsPerMonth: 4 },
] as const

type Frequency = (typeof PAYMENT_FREQUENCIES)[number]["value"]
type RateTier = {
  label: string
  rangeLabel: string
}

function getMonthlyRate(months: number): number {
  if (months >= 1 && months <= 6) return 7
  if (months >= 7 && months <= 9) return 6
  if (months >= 10 && months <= 12) return 5
  if (months >= 13 && months <= 15) return 4
  if (months >= 16 && months <= 17) return 3
  throw new Error("Invalid term. Maximum is 17 months.")
}

function getRateTier(months: number): RateTier {
  if (months >= 1 && months <= 6) return { label: "Short-term Financing", rangeLabel: "1-6 months" }
  if (months >= 7 && months <= 9) return { label: "Mid-term Solutions", rangeLabel: "7-9 months" }
  if (months >= 10 && months <= 12) return { label: "Extended Advantage", rangeLabel: "10-12 months" }
  if (months >= 13 && months <= 15) return { label: "Premium Rate", rangeLabel: "13-15 months" }
  if (months >= 16 && months <= 17) return { label: "Ultimate Low-rate", rangeLabel: "16-17 months" }
  throw new Error("Invalid term. Maximum is 17 months.")
}

function clampTerm(value: number) {
  if (Number.isNaN(value)) return MIN_TERM
  return Math.min(MAX_TERM, Math.max(MIN_TERM, Math.trunc(value)))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function LoanEstimator() {
  const [principal, setPrincipal] = useState(50000)
  const [term, setTerm] = useState(6)
  const [frequency, setFrequency] = useState<Frequency>("SEMI_MONTHLY")

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
    <section className="glass-panel mb-14 w-full max-w-md rounded-[2rem] p-5 shadow-xl sm:mb-16 sm:p-6 md:p-8">
      <h3 className="mb-2 text-center text-lg font-bold tracking-tight text-slate-800 sm:text-xl">INSTANT PAYMENT ESTIMATOR</h3>
      <p className="mb-6 text-center text-sm leading-relaxed text-slate-600">
        Monthly rates are auto-assigned by selected term using NRM&apos;s approved tier matrix (1-17 months only).
      </p>

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
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={STEP_AMOUNT}
          value={principal}
          onChange={(event) => setPrincipal(Number(event.target.value))}
          className="loan-range mb-3 w-full"
          aria-label="Loan amount slider"
        />
        <div className="flex justify-between text-xs font-medium text-slate-500">
          <span>{formatCurrency(MIN_AMOUNT).replace(".00", "")}</span>
          <span>{formatCurrency(MAX_AMOUNT).replace(".00", "")}</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase text-slate-600">Loan Term</p>
          <p className="text-sm text-slate-500">{term} month{term === 1 ? "" : "s"}</p>
        </div>
        <div className="glass-panel-strong rounded-xl p-3 sm:p-4">
          <div className="mb-3 flex items-center gap-3">
            <input
              id="term-slider"
              type="range"
              min={MIN_TERM}
              max={MAX_TERM}
              step={1}
              value={term}
              onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
              className="loan-range w-full accent-emerald-600"
              aria-label="Loan term in months"
            />
            <input
              type="number"
              min={MIN_TERM}
              max={MAX_TERM}
              value={term}
              onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
              className="w-20 rounded-lg border border-slate-300 bg-white/95 px-2 py-1.5 text-right text-sm font-semibold text-slate-700"
              aria-label="Loan term number input"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{MIN_TERM} month</span>
            <span>{MAX_TERM} months</span>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/85 px-3 py-2 text-sm text-emerald-800">
            <p className="font-semibold">{estimate.rateTier.label}</p>
            <p>Applicable range: {estimate.rateTier.rangeLabel}</p>
          </div>
        </div>
      </div>

      <div className="mb-6">
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

      <div className="mb-6 flex items-center justify-between border-t border-slate-200 pt-4">
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
          <p className="text-slate-500">Est. interest per month</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.estimatedInterest)}</p>
        </div>
        <div className="glass-panel-strong rounded-lg p-3">
          <p className="text-slate-500">Total interest</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalInterest)}</p>
        </div>
        <div className="glass-panel-strong rounded-lg p-3 sm:col-span-2">
          <p className="text-slate-500">Total payable amount</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalPayable)}</p>
        </div>
      </div>

      <Link
        href="/login"
        className="swift-transition inline-flex min-h-11 w-full items-center justify-center rounded-full bg-emerald-600 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-[0.99] sm:text-lg"
      >
        START YOUR APPLICATION
      </Link>
      <p className="mt-3 text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
        Estimates are for reference only. Terms above 17 months are not allowed; final approval and release remain subject to NRM credit evaluation.
      </p>
    </section>
  )
}
