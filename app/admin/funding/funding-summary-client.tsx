"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface FundingSummary {
  totalDeposits: string
  totalCollections: string
  totalWithdrawals: string
  totalDisbursed: string
  cashAvailable: string
}

interface FundingTransaction {
  id: string
  transactionType: "DEPOSIT" | "WITHDRAWAL"
  amount: string
  transactionDate: string
  referenceNumber: string | null
  notes: string | null
}

function formatCurrency(value: string) {
  const amount = Number(value || "0")
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function FundingSummaryClient() {
  const [loading, setLoading] = React.useState(true)
  const [summary, setSummary] = React.useState<FundingSummary>({
    totalDeposits: "0",
    totalCollections: "0",
    totalWithdrawals: "0",
    totalDisbursed: "0",
    cashAvailable: "0",
  })
  const [transactions, setTransactions] = React.useState<FundingTransaction[]>([])

  React.useEffect(() => {
    let active = true
    async function loadFunding() {
      setLoading(true)
      try {
        const [summaryRes, transactionsRes] = await Promise.all([
          fetch("/api/admin/funding/summary"),
          fetch("/api/admin/funding/transactions?page=1&pageSize=10"),
        ])
        const [summaryPayload, transactionsPayload] = await Promise.all([summaryRes.json(), transactionsRes.json()])
        if (!active) return

        if (summaryPayload.success) {
          setSummary(summaryPayload.data)
        }
        if (transactionsPayload.success) {
          setTransactions(transactionsPayload.data ?? [])
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadFunding()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Funding</h1>
          <p className="text-muted-foreground">Track cash inflow, outflow, and real liquid funding position.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/funding/add">
            <Button>Add Funding</Button>
          </Link>
          <Link href="/admin/funding/withdraw">
            <Button variant="outline">Withdraw Funding</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(summary.totalDeposits)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(summary.totalCollections)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(summary.totalWithdrawals)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(summary.totalDisbursed)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrency(summary.cashAvailable)}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No funding transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-xs">{new Date(row.transactionDate).toLocaleDateString()}</TableCell>
                  <TableCell>{row.transactionType}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.amount)}</TableCell>
                  <TableCell className="text-xs">{row.referenceNumber || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{row.notes || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
