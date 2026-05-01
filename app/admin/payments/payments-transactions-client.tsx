"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { listPayments } from "@/lib/actions/admin/payments"
import { removePayment } from "@/lib/actions/admin/payments"
import { formatCurrencyPHP, formatDate } from "@/lib/presentation/formatters"

interface PaymentRow {
  id: string
  loanId: string
  amount: string
  paymentType: "REGULAR" | "ADVANCE" | "PENALTY"
  paymentMethod: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
  paymentDate: string | Date
  notes: string | null
}

export function PaymentsTransactionsClient() {
  const [page, setPage] = React.useState(1)
  const [paymentToRemove, setPaymentToRemove] = React.useState<PaymentRow | null>(null)
  const [removeReason, setRemoveReason] = React.useState("")
  const [removeError, setRemoveError] = React.useState<string | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)
  const pageSize = 20

  const paymentsQuery = useQuery({
    queryKey: ["admin", "payments", { page, pageSize }],
    queryFn: async () => {
      const res = await listPayments({ page, pageSize })
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const loading = paymentsQuery.isLoading
  const rows: PaymentRow[] = paymentsQuery.data?.rows ?? []
  const total = paymentsQuery.data?.total ?? 0

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const closeRemoveDialog = () => {
    setPaymentToRemove(null)
    setRemoveReason("")
    setRemoveError(null)
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

      await paymentsQuery.refetch()
      closeRemoveDialog()
    } catch {
      setRemoveError("An unexpected error occurred while removing payment.")
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Transactions</h1>
          <p className="text-muted-foreground">Review all recorded payment entries.</p>
        </div>
        <Link href="/admin/payments/new">
          <Button>Record Payment</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Loan</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading transactions...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No payment transactions found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{formatDate(row.paymentDate)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/admin/loans?search=${encodeURIComponent(row.loanId)}`} className="text-primary hover:underline">
                      {row.loanId}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrencyPHP(row.amount)}</TableCell>
                  <TableCell>{row.paymentType}</TableCell>
                  <TableCell>{row.paymentMethod}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.notes || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" size="sm" variant="destructive" onClick={() => setPaymentToRemove(row)}>
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages} ({total} total transactions)
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={Boolean(paymentToRemove)} onOpenChange={(open) => !open && closeRemoveDialog()}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleRemovePayment}>
            <DialogHeader>
              <DialogTitle>Remove Payment Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                This reverses balances and removes the payment from active records, while preserving the deletion in audit logs.
              </p>
              <div className="grid gap-2">
                <Label htmlFor="removePaymentReason">Reason</Label>
                <textarea
                  id="removePaymentReason"
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
