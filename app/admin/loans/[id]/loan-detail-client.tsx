"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Pencil } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { getLoanById, getLoanPayments, getLoanSchedule } from "@/lib/actions/admin/loans"
import { removePayment, updatePayment } from "@/lib/actions/admin/payments"
import { formatCurrencyPHP, formatDate } from "@/lib/presentation/formatters"
import { getRepaymentStatusBadge, type RepaymentStatus } from "@/lib/presentation/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface LoanDetailClientProps {
  loanId: string
}

type ScheduleTerm = {
  id: string
  termNumber: number
  dueDate: string | Date
  amountDue: string
  principalDue: string
  interestDue: string
  amountPaid: string
  remainingAmount?: string
  effectiveAmountPaid?: string
  effectiveRemainingAmount?: string
  isPaid: boolean
}

type PaymentRow = {
  id: string
  loanId: string
  paymentScheduleId: string | null
  amount: string
  paymentType: "REGULAR" | "ADVANCE" | "PENALTY"
  paymentMethod: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
  paymentDate: string | Date
  penaltyReason: string | null
  notes: string | null
}

function getTermStatus(term: ScheduleTerm): RepaymentStatus {
  const amountDue = Number(term.amountDue || "0")
  const amountPaid = Number(term.effectiveAmountPaid ?? term.amountPaid ?? "0")
  const remaining = Number(term.effectiveRemainingAmount ?? Math.max(0, amountDue - amountPaid))

  if (remaining <= 0) return "PAID"

  const now = new Date()
  const dueDate = new Date(term.dueDate)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
  const hasPartialPayment = amountPaid > 0

  if (startOfDue < startOfToday) return "OVERDUE"
  if (startOfDue.getTime() === startOfToday.getTime()) return hasPartialPayment ? "PARTIAL" : "DUE"
  if (hasPartialPayment) return "PARTIAL"
  return "UPCOMING"
}

function toDateInputValue(value: string | Date) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function LoanDetailClient({ loanId }: LoanDetailClientProps) {
  const loanQuery = useQuery({
    queryKey: ["admin", "loan", loanId, "detail"],
    queryFn: async () => {
      const res = await getLoanById(loanId)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const scheduleQuery = useQuery({
    queryKey: ["admin", "loan", loanId, "schedule"],
    queryFn: async () => {
      const res = await getLoanSchedule(loanId)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const paymentsQuery = useQuery({
    queryKey: ["admin", "loan", loanId, "payments"],
    queryFn: async () => {
      const res = await getLoanPayments(loanId)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const [selectedPayment, setSelectedPayment] = React.useState<PaymentRow | null>(null)
  const [editAmount, setEditAmount] = React.useState("")
  const [editPaymentType, setEditPaymentType] = React.useState<"REGULAR" | "ADVANCE" | "PENALTY">("REGULAR")
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<"CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER">("CASH")
  const [editPaymentScheduleId, setEditPaymentScheduleId] = React.useState("")
  const [editPaymentDate, setEditPaymentDate] = React.useState("")
  const [editPenaltyReason, setEditPenaltyReason] = React.useState("")
  const [editNotes, setEditNotes] = React.useState("")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [paymentToRemove, setPaymentToRemove] = React.useState<PaymentRow | null>(null)
  const [removeReason, setRemoveReason] = React.useState("")
  const [removeError, setRemoveError] = React.useState<string | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  const scheduleRows: ScheduleTerm[] = scheduleQuery.data ?? []
  const paymentRows: PaymentRow[] = paymentsQuery.data ?? []
  const isLoading = loanQuery.isLoading || scheduleQuery.isLoading || paymentsQuery.isLoading
  const hasError = loanQuery.isError || scheduleQuery.isError || paymentsQuery.isError

  const openEditPayment = (payment: PaymentRow) => {
    setSelectedPayment(payment)
    setEditAmount(payment.amount)
    setEditPaymentType(payment.paymentType)
    setEditPaymentMethod(payment.paymentMethod)
    setEditPaymentScheduleId(payment.paymentScheduleId ?? "")
    setEditPaymentDate(toDateInputValue(payment.paymentDate))
    setEditPenaltyReason(payment.penaltyReason ?? "")
    setEditNotes(payment.notes ?? "")
    setSubmitError(null)
  }

  const closeEditPayment = () => {
    setSelectedPayment(null)
    setSubmitError(null)
  }

  const closeRemoveDialog = () => {
    setPaymentToRemove(null)
    setRemoveReason("")
    setRemoveError(null)
  }

  async function handleUpdatePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedPayment) return
    setSubmitError(null)
    setIsSaving(true)

    try {
      const result = await updatePayment({
        paymentId: selectedPayment.id,
        amount: editAmount.trim(),
        paymentType: editPaymentType,
        paymentMethod: editPaymentMethod,
        paymentScheduleId: editPaymentScheduleId || null,
        paymentDate: new Date(editPaymentDate),
        penaltyReason: editPaymentType === "PENALTY" ? editPenaltyReason.trim() : null,
        notes: editNotes.trim() || null,
      })

      if (!result.success) {
        setSubmitError(result.error || "Failed to update payment.")
        return
      }

      await Promise.all([loanQuery.refetch(), scheduleQuery.refetch(), paymentsQuery.refetch()])
      closeEditPayment()
    } catch {
      setSubmitError("An unexpected error occurred while updating payment.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleRemovePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentToRemove) return
    setRemoveError(null)
    setIsRemoving(true)

    try {
      const result = await removePayment({
        paymentId: paymentToRemove.id,
        reason: removeReason.trim(),
      })
      if (!result.success) {
        setRemoveError(result.error || "Failed to remove payment.")
        return
      }

      await Promise.all([loanQuery.refetch(), scheduleQuery.refetch(), paymentsQuery.refetch()])
      closeRemoveDialog()
    } catch {
      setRemoveError("An unexpected error occurred while removing payment.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loan Details</h1>
          <p className="text-muted-foreground">Review repayment schedule and edit recorded payment entries.</p>
        </div>
        <Link href="/admin/loans">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Loans
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : hasError || !loanQuery.data ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Unable to load loan details.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={loanQuery.data.status === "ACTIVE" ? "default" : "secondary"}>
                  {loanQuery.data.status}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Principal</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatCurrencyPHP(loanQuery.data.principalAmount)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatCurrencyPHP(loanQuery.data.totalPaid)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatCurrencyPHP(loanQuery.data.outstandingBalance)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
              </CardHeader>
              <CardContent className="font-semibold">{formatCurrencyPHP(loanQuery.data.totalPayable)}</CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Repayment Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Term</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleRows.map((term) => {
                    const amountDue = Number(term.amountDue || "0")
                    const amountPaid = Number(term.effectiveAmountPaid ?? term.amountPaid ?? "0")
                    const remainingAmount = Number(term.effectiveRemainingAmount ?? Math.max(0, amountDue - amountPaid))
                    const status = getTermStatus(term)
                    return (
                      <TableRow key={term.id}>
                        <TableCell>{term.termNumber}</TableCell>
                        <TableCell>{formatDate(term.dueDate)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPHP(term.amountDue)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPHP(term.principalDue)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPHP(term.interestDue)}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPHP(amountPaid.toFixed(2))}</TableCell>
                        <TableCell className="text-right">{formatCurrencyPHP(remainingAmount.toFixed(2))}</TableCell>
                        <TableCell className="text-right">
                          <Badge {...getRepaymentStatusBadge(status)}>
                            {status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base">Payment History (Editable)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Schedule Term</TableHead>
                    <TableHead>Penalty Reason</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                        No recorded payments yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paymentRows.map((payment) => {
                      const linkedTerm = scheduleRows.find((term) => term.id === payment.paymentScheduleId)
                      return (
                        <TableRow key={payment.id}>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrencyPHP(payment.amount)}</TableCell>
                          <TableCell>{payment.paymentType}</TableCell>
                          <TableCell>{payment.paymentMethod}</TableCell>
                          <TableCell>{linkedTerm ? `Term ${linkedTerm.termNumber}` : "Unlinked"}</TableCell>
                          <TableCell className="text-xs">{payment.penaltyReason || "—"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {payment.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => openEditPayment(payment)}>
                                <Pencil className="mr-1 h-3.5 w-3.5" />
                                Edit
                              </Button>
                              <Button type="button" size="sm" variant="destructive" onClick={() => setPaymentToRemove(payment)}>
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={Boolean(selectedPayment)} onOpenChange={(open) => !open && closeEditPayment()}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleUpdatePayment}>
            <DialogHeader>
              <DialogTitle>Edit Payment</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="editAmount">Amount</Label>
                  <Input id="editAmount" value={editAmount} onChange={(event) => setEditAmount(event.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editPaymentDate">Payment Date</Label>
                  <Input
                    id="editPaymentDate"
                    type="date"
                    value={editPaymentDate}
                    onChange={(event) => setEditPaymentDate(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="editPaymentType">Payment Type</Label>
                  <select
                    id="editPaymentType"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={editPaymentType}
                    onChange={(event) => setEditPaymentType(event.target.value as "REGULAR" | "ADVANCE" | "PENALTY")}
                  >
                    <option value="REGULAR">Regular</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="PENALTY">Penalty</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="editPaymentMethod">Payment Method</Label>
                  <select
                    id="editPaymentMethod"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={editPaymentMethod}
                    onChange={(event) => setEditPaymentMethod(event.target.value as "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER")}
                  >
                    <option value="CASH">Cash</option>
                    <option value="GCASH">GCash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="editPaymentScheduleId">Schedule Term (Optional)</Label>
                <select
                  id="editPaymentScheduleId"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={editPaymentScheduleId}
                  onChange={(event) => setEditPaymentScheduleId(event.target.value)}
                >
                  <option value="">No specific term</option>
                  {scheduleRows.map((term) => (
                    <option key={term.id} value={term.id}>
                      Term {term.termNumber} - {formatDate(term.dueDate)} ({formatCurrencyPHP(term.amountDue)})
                    </option>
                  ))}
                </select>
              </div>

              {editPaymentType === "PENALTY" && (
                <div className="grid gap-2">
                  <Label htmlFor="editPenaltyReason">Penalty Reason</Label>
                  <Input
                    id="editPenaltyReason"
                    value={editPenaltyReason}
                    onChange={(event) => setEditPenaltyReason(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="editNotes">Notes (Optional)</Label>
                <textarea
                  id="editNotes"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                />
              </div>

              {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditPayment} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !editAmount.trim() || !editPaymentDate}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(paymentToRemove)} onOpenChange={(open) => !open && closeRemoveDialog()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleRemovePayment}>
            <DialogHeader>
              <DialogTitle>Remove Payment Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                This will reverse the loan/schedule balances and remove this payment from active records. The deletion will remain in audit history logs.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="removeReason">Reason</Label>
                <textarea
                  id="removeReason"
                  className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                  value={removeReason}
                  onChange={(event) => setRemoveReason(event.target.value)}
                  required
                />
              </div>
              {removeError ? <p className="text-sm text-destructive">{removeError}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeRemoveDialog} disabled={isRemoving}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isRemoving || removeReason.trim().length < 3}>
                {isRemoving ? "Removing..." : "Remove Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
