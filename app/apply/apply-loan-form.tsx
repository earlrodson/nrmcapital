"use client"

import { useMemo, useState, useTransition, type FormEvent } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"

import { submitLoanApplication } from "@/lib/actions/applications"
import { CONFIG } from "@/lib/config"
import { formatCurrencyPHP } from "@/lib/presentation/formatters"

type PaymentFrequency = "MONTHLY" | "SEMI_MONTHLY" | "WEEKLY"

const frequencyToTermsPerMonth: Record<PaymentFrequency, number> = {
  MONTHLY: 1,
  SEMI_MONTHLY: 2,
  WEEKLY: 4,
}

type ApplyLoanFormProps = {
  initialPrincipal: number
  initialMonths: number
  initialPaymentFrequency?: string
  initialMonthlyInterestRate: number
}

function normalizeFrequency(value?: string): PaymentFrequency {
  if (value === "MONTHLY" || value === "SEMI_MONTHLY" || value === "WEEKLY") return value
  return "SEMI_MONTHLY"
}

export function ApplyLoanForm({
  initialPrincipal,
  initialMonths,
  initialPaymentFrequency,
  initialMonthlyInterestRate,
}: ApplyLoanFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    applicantEmail: "",
    contactNumber: "",
    address: "",
    principalAmount: String(initialPrincipal),
    months: String(initialMonths),
    paymentFrequency: normalizeFrequency(initialPaymentFrequency) as PaymentFrequency,
    monthlyInterestRate: String(initialMonthlyInterestRate),
    notes: "",
  })

  const estimate = useMemo(() => {
    const principal = Number(form.principalAmount)
    const monthlyRate = Number(form.monthlyInterestRate)
    const months = Number(form.months)
    const termsPerMonth = frequencyToTermsPerMonth[form.paymentFrequency]
    if (!Number.isFinite(principal) || !Number.isFinite(monthlyRate) || !Number.isFinite(months)) return null
    const estimatedInterest = principal * (monthlyRate / 100)
    const totalInterest = estimatedInterest * months
    const totalPayable = principal + totalInterest
    const totalTerms = months * termsPerMonth
    const installmentAmount = totalPayable / totalTerms
    return { totalPayable, totalTerms, installmentAmount }
  }, [form])

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitLoanApplication({
        firstName: form.firstName,
        lastName: form.lastName,
        applicantEmail: form.applicantEmail,
        contactNumber: form.contactNumber || undefined,
        address: form.address || undefined,
        principalAmount: Number(form.principalAmount),
        monthlyInterestRate: Number(form.monthlyInterestRate),
        months: Number(form.months),
        termsPerMonth: frequencyToTermsPerMonth[form.paymentFrequency],
        paymentFrequency: form.paymentFrequency,
        notes: form.notes || undefined,
      })

      if (!result.success) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  if (success) {
    return (
      <section className="glass-panel w-full max-w-2xl rounded-[2rem] border border-white/50 p-8 text-center shadow-2xl backdrop-blur-xl">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Application submitted</h1>
        <p className="text-sm text-slate-600">
          Your loan application is now in our review queue. An admin will approve or reject it after evaluation.
        </p>
      </section>
    )
  }

  return (
    <section className="grid w-full gap-6 lg:grid-cols-5">
      <form onSubmit={onSubmit} className="glass-panel w-full rounded-[2rem] border border-white/50 p-6 shadow-2xl backdrop-blur-xl lg:col-span-3">
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Loan Application</h1>
        <p className="mb-6 text-sm text-slate-600">Complete the form below to submit your application for admin review.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input required value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Last name
            <input required value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Email
            <input required type="email" value={form.applicantEmail} onChange={(event) => updateField("applicantEmail", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Contact number
            <input value={form.contactNumber} onChange={(event) => updateField("contactNumber", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Address
            <input value={form.address} onChange={(event) => updateField("address", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Loan amount
            <input required min={CONFIG.LOAN_LIMITS.MIN_AMOUNT} max={CONFIG.LOAN_LIMITS.MAX_AMOUNT} type="number" value={form.principalAmount} onChange={(event) => updateField("principalAmount", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Months
            <input required min={CONFIG.LOAN_LIMITS.MIN_TERM_MONTHS} max={CONFIG.LOAN_LIMITS.MAX_TERM_MONTHS} type="number" value={form.months} onChange={(event) => updateField("months", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Payment frequency
            <select value={form.paymentFrequency} onChange={(event) => updateField("paymentFrequency", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800">
              <option value="MONTHLY">Monthly</option>
              <option value="SEMI_MONTHLY">Semi-monthly</option>
              <option value="WEEKLY">Weekly</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Monthly interest rate (%)
            <input required min={1} max={100} type="number" value={form.monthlyInterestRate} onChange={(event) => updateField("monthlyInterestRate", event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Notes (optional)
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2.5 text-sm text-slate-800" />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Submit Application
        </button>
      </form>

      <aside className="glass-panel h-fit rounded-[2rem] border border-white/50 p-6 shadow-xl backdrop-blur-xl lg:col-span-2">
        <h2 className="mb-3 text-lg font-bold text-slate-800">Estimation summary</h2>
        {estimate ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p className="flex justify-between"><span>Estimated installment</span><span className="font-semibold">{formatCurrencyPHP(estimate.installmentAmount)}</span></p>
            <p className="flex justify-between"><span>Total terms</span><span className="font-semibold">{estimate.totalTerms}</span></p>
            <p className="flex justify-between border-t border-slate-200 pt-3"><span>Total payable</span><span className="font-semibold">{formatCurrencyPHP(estimate.totalPayable)}</span></p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">Enter valid loan values to see a live estimate summary.</p>
        )}
        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Existing admin-created loans remain already approved. This workflow only applies to new loans submitted through this form.
        </p>
      </aside>
    </section>
  )
}
