"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, CreditCard, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface PaymentSummaryResponse {
  success: boolean
  data: {
    totalPayments: string
    totalTransactions: number
    overdueCount: number
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

export function PaymentsSummaryClient() {
  const [loading, setLoading] = React.useState(true)
  const [summary, setSummary] = React.useState({
    totalPayments: "0",
    totalTransactions: 0,
    overdueCount: 0,
  })

  React.useEffect(() => {
    let active = true
    async function loadSummary() {
      setLoading(true)
      try {
        const res = await fetch("/api/admin/payments/summary")
        const payload: PaymentSummaryResponse = await res.json()
        if (!active) return
        if (payload.success) {
          setSummary(payload.data)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadSummary()
    return () => {
      active = false
    }
  }, [])

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
            <div className="text-2xl font-bold">{loading ? "..." : formatCurrency(summary.totalPayments)}</div>
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
