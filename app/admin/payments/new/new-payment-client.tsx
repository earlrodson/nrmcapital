"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface LoanContext {
  loan: {
    id: string
    status: "ACTIVE" | "COMPLETED" | "DEFAULTED"
    outstandingBalance: string
    totalPaid: string
    totalPayable: string
  }
  client: {
    id: string
    firstName: string
    lastName: string
    contactNumber: string | null
  } | null
}

interface PaymentScheduleRow {
  id: string
  termNumber: number
  dueDate: string
  amountDue: string
  isPaid: boolean
}

function formatCurrency(value: string) {
  const amount = Number(value || "0")
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function NewPaymentClient() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialLoanId = searchParams.get("loanId") ?? ""
  const [loanId, setLoanId] = React.useState(initialLoanId)
  const [amount, setAmount] = React.useState("")
  const [paymentType, setPaymentType] = React.useState<"REGULAR" | "ADVANCE" | "PENALTY">("REGULAR")
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER">("CASH")
  const [paymentScheduleId, setPaymentScheduleId] = React.useState("")
  const [penaltyReason, setPenaltyReason] = React.useState("")
  const [notes, setNotes] = React.useState("")

  const [loadingContext, setLoadingContext] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [context, setContext] = React.useState<LoanContext | null>(null)
  const [scheduleRows, setScheduleRows] = React.useState<PaymentScheduleRow[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function loadLoanContext() {
      const normalizedLoanId = loanId.trim().replace(/^#/, "")
      if (!normalizedLoanId) {
        setContext(null)
        setScheduleRows([])
        return
      }

      setLoadingContext(true)
      setError(null)
      try {
        const loansRes = await fetch(`/api/admin/loans?search=${encodeURIComponent(normalizedLoanId)}&page=1&pageSize=20`)
        const loansPayload = await loansRes.json()

        const candidates = Array.isArray(loansPayload.data) ? loansPayload.data : []
        const exactMatch = candidates.find((row: { loans?: { id?: string } }) => row.loans?.id === normalizedLoanId)
        const prefixedMatch = candidates.find((row: { loans?: { id?: string } }) =>
          typeof row.loans?.id === "string" ? row.loans.id.startsWith(normalizedLoanId) : false
        )
        const matchedRow = exactMatch ?? prefixedMatch ?? null

        if (!matchedRow) {
          setContext(null)
          setScheduleRows([])
          setError("Loan not found. Verify the loan ID and try again.")
          return
        }

        const resolvedLoanId = matchedRow.loans.id
        setContext({
          loan: matchedRow.loans,
          client: matchedRow.clients ?? null,
        })

        const scheduleRes = await fetch(`/api/admin/loans/${resolvedLoanId}/schedule`)
        const schedulePayload = await scheduleRes.json()
        const schedules = Array.isArray(schedulePayload.data) ? schedulePayload.data : []
        setScheduleRows(schedules)
      } catch {
        setError("Failed to load loan context.")
      } finally {
        setLoadingContext(false)
      }
    }

    void loadLoanContext()
  }, [loanId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!loanId.trim() || !amount.trim()) {
      setError("Loan ID and amount are required.")
      return
    }

    if (paymentType === "PENALTY" && !penaltyReason.trim()) {
      setError("Penalty reason is required for penalty payments.")
      return
    }
    if (!context) {
      setError("Loan context is required before submitting a payment.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loanId: context.loan.id,
          amount: amount.trim(),
          paymentType,
          paymentMethod,
          paymentScheduleId: paymentScheduleId || undefined,
          penaltyReason: paymentType === "PENALTY" ? penaltyReason.trim() : undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const payload = await response.json()
      if (!payload.success) {
        setError(payload.error?.message || "Failed to record payment.")
        return
      }

      setSuccessMessage("Payment recorded successfully. Redirecting to loans...")
      setTimeout(() => {
        router.push("/admin/loans")
      }, 900)
    } catch {
      setError("Something went wrong while recording payment.")
    } finally {
      setSubmitting(false)
    }
  }

  const unpaidTerms = scheduleRows.filter((row) => !row.isPaid)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Record Payment</h1>
        <p className="text-muted-foreground">Record regular, advance, or penalty payment entries.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Loan Context</CardTitle>
          <CardDescription>Loan details are auto-loaded when a valid loan ID is provided.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="loanId">Loan ID</Label>
            <Input
              id="loanId"
              value={loanId}
              onChange={(event) => setLoanId(event.target.value)}
              placeholder="Enter full loan UUID"
              required
            />
          </div>

          {loadingContext ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading loan context...
            </div>
          ) : context ? (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">#{context.loan.id.split("-")[0]}</p>
                <Badge variant={context.loan.status === "ACTIVE" ? "default" : "secondary"}>
                  {context.loan.status}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Borrower:{" "}
                <span className="text-foreground font-medium">
                  {context.client ? `${context.client.firstName} ${context.client.lastName}` : "Unknown"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Outstanding</p>
                  <p className="font-semibold">{formatCurrency(context.loan.outstandingBalance)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Paid</p>
                  <p className="font-semibold">{formatCurrency(context.loan.totalPaid)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Payable</p>
                  <p className="font-semibold">{formatCurrency(context.loan.totalPayable)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Entry</CardTitle>
          <CardDescription>Submit a payment and update loan balances.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 1500.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentType">Payment Type</Label>
                <select
                  id="paymentType"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={paymentType}
                  onChange={(event) => setPaymentType(event.target.value as "REGULAR" | "ADVANCE" | "PENALTY")}
                >
                  <option value="REGULAR">Regular</option>
                  <option value="ADVANCE">Advance</option>
                  <option value="PENALTY">Penalty</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value as "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER")}
                >
                  <option value="CASH">Cash</option>
                  <option value="GCASH">GCash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paymentScheduleId">Schedule Term (Optional)</Label>
                <select
                  id="paymentScheduleId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={paymentScheduleId}
                  onChange={(event) => setPaymentScheduleId(event.target.value)}
                >
                  <option value="">No specific term</option>
                  {unpaidTerms.map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.termNumber} - {new Date(term.dueDate).toLocaleDateString()} ({formatCurrency(term.amountDue)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {paymentType === "PENALTY" && (
              <div className="grid gap-2">
                <Label htmlFor="penaltyReason">Penalty Reason</Label>
                <Input
                  id="penaltyReason"
                  value={penaltyReason}
                  onChange={(event) => setPenaltyReason(event.target.value)}
                  placeholder="Reason for penalty charge"
                  required
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Additional payment details"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-green-600 dark:text-green-400">{successMessage}</p>}

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                disabled={submitting || loadingContext || !loanId.trim() || !amount.trim() || !context}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Record Payment
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/loans")} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
