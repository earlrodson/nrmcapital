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
    <section className="mb-16 w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-6 shadow-2xl md:p-8">
      <h3 className="mb-2 text-center text-lg font-bold text-slate-800">INSTANT PAYMENT ESTIMATOR</h3>
      <p className="mb-6 text-center text-xs text-slate-500">
        Monthly rates are auto-assigned by selected term using NRM&apos;s approved tier matrix (1-17 months only).
      </p>

      <div className="mb-6">
        <div className="mb-4 flex items-center justify-between">
          <label htmlFor="amount-slider" className="text-sm font-semibold uppercase text-slate-600">
            Loan Amount
          </label>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-1 text-xl font-bold">
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
          className="loan-range mb-2 w-full"
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
        <div className="rounded-xl bg-slate-100 p-3">
          <div className="mb-3 flex items-center gap-3">
            <input
              id="term-slider"
              type="range"
              min={MIN_TERM}
              max={MAX_TERM}
              step={1}
              value={term}
              onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
              className="w-full accent-emerald-600"
              aria-label="Loan term in months"
            />
            <input
              type="number"
              min={MIN_TERM}
              max={MAX_TERM}
              value={term}
              onChange={(event) => setTerm(clampTerm(Number(event.target.value)))}
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm font-semibold text-slate-700"
              aria-label="Loan term number input"
            />
          </div>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>{MIN_TERM} month</span>
            <span>{MAX_TERM} months</span>
          </div>
          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
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
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Payment frequency options">
          {PAYMENT_FREQUENCIES.map((item) => {
            const active = item.value === frequency
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setFrequency(item.value)}
                className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 ${
                  active ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-sm font-semibold text-slate-600">MONTHLY INTEREST RATE</p>
          <p className="text-xs text-slate-500">{estimate.rateTier.rangeLabel}</p>
        </div>
        <p className="font-bold text-slate-800">{estimate.monthlyRate.toFixed(2)}%</p>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
        <p className="mb-2 text-sm font-bold text-slate-800">ESTIMATED {selectedFrequency.label.toUpperCase()} PAYMENT:</p>
        <p className="text-5xl font-extrabold tracking-tight text-emerald-600">{formatCurrency(estimate.installmentAmount)}</p>
        <p className="mt-3 text-[10px] text-slate-400">Estimated for {estimate.totalTerms} total installments.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 text-left text-xs">
        <div className="rounded-lg border border-slate-100 bg-white p-3">
          <p className="text-slate-500">Est. interest per month</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.estimatedInterest)}</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-white p-3">
          <p className="text-slate-500">Total interest</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalInterest)}</p>
        </div>
        <div className="col-span-2 rounded-lg border border-slate-100 bg-white p-3">
          <p className="text-slate-500">Total payable amount</p>
          <p className="font-semibold text-slate-800">{formatCurrency(estimate.totalPayable)}</p>
        </div>
      </div>

      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 py-4 text-lg font-bold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        START YOUR APPLICATION
      </Link>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        Estimates are for reference only. Terms above 17 months are not allowed; final approval and release remain subject to NRM credit evaluation.
      </p>
    </section>
  )
}
