"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface PaymentRow {
  id: string
  loanId: string
  amount: string
  paymentType: "REGULAR" | "ADVANCE" | "PENALTY"
  paymentMethod: "CASH" | "GCASH" | "BANK_TRANSFER" | "OTHER"
  paymentDate: string
  notes: string | null
}

interface PaymentsResponse {
  success: boolean
  data: PaymentRow[]
  meta?: {
    page: number
    pageSize: number
    total: number
  }
}

function formatCurrency(value: string) {
  const amount = Number(value || "0")
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function PaymentsTransactionsClient() {
  const [rows, setRows] = React.useState<PaymentRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(20)
  const [total, setTotal] = React.useState(0)

  React.useEffect(() => {
    let active = true

    async function loadTransactions() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/payments?page=${page}&pageSize=${pageSize}`)
        const payload: PaymentsResponse = await res.json()
        if (!active) return
        if (payload.success) {
          setRows(payload.data)
          setTotal(payload.meta?.total ?? 0)
        } else {
          setRows([])
          setTotal(0)
        }
      } catch {
        if (!active) return
        setRows([])
        setTotal(0)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadTransactions()
    return () => {
      active = false
    }
  }, [page, pageSize])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading transactions...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No payment transactions found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{new Date(row.paymentDate).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">#{row.loanId.split("-")[0]}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.amount)}</TableCell>
                  <TableCell>{row.paymentType}</TableCell>
                  <TableCell>{row.paymentMethod}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.notes || "—"}</TableCell>
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
    </div>
  )
}
