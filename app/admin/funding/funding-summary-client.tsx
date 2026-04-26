"use client"

import * as React from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getFundingSummary, listFundingTransactions } from "@/lib/actions/admin/investors"
import { formatCurrencyPHP, formatDate } from "@/lib/presentation/formatters"

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
  transactionDate: string | Date
  referenceNumber: string | null
  notes: string | null
}

export function FundingSummaryClient() {
  const summaryQuery = useQuery({
    queryKey: ["admin", "funding", "summary"],
    queryFn: async () => {
      const res = await getFundingSummary()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })
  const transactionsQuery = useQuery({
    queryKey: ["admin", "funding", "transactions", { page: 1, pageSize: 10 }],
    queryFn: async () => {
      const res = await listFundingTransactions({ page: 1, pageSize: 10 })
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const loading = summaryQuery.isLoading || transactionsQuery.isLoading
  const summary: FundingSummary = summaryQuery.data ?? {
    totalDeposits: "0",
    totalCollections: "0",
    totalWithdrawals: "0",
    totalDisbursed: "0",
    cashAvailable: "0",
  }
  const transactions: FundingTransaction[] = transactionsQuery.data?.rows ?? []

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
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrencyPHP(summary.totalDeposits)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrencyPHP(summary.totalCollections)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrencyPHP(summary.totalWithdrawals)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrencyPHP(summary.totalDisbursed)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cash Available</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : formatCurrencyPHP(summary.cashAvailable)}
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
                  <TableCell className="text-xs">{formatDate(row.transactionDate)}</TableCell>
                  <TableCell>{row.transactionType}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrencyPHP(row.amount)}</TableCell>
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
