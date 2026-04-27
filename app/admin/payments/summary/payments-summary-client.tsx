"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, CreditCard, Wallet } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getPaymentSummary } from "@/lib/actions/admin/payments"
import { formatCurrencyPHP } from "@/lib/presentation/formatters"

export function PaymentsSummaryClient() {
  const summaryQuery = useQuery({
    queryKey: ["admin", "payments", "summary"],
    queryFn: async () => {
      const res = await getPaymentSummary()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })
  const loading = summaryQuery.isLoading
  const summary = summaryQuery.data ?? {
    totalPayments: "0",
    totalTransactions: 0,
    overdueCount: 0,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Summary</h1>
          <p className="text-muted-foreground">Operational snapshot of collections and overdue risk.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/payments">
            <Button variant="outline">View Transactions</Button>
          </Link>
          <Link href="/admin/payments/new">
            <Button>Record Payment</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrencyPHP(summary.totalPayments)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : summary.totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Overdue Terms</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{loading ? "..." : summary.overdueCount}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
