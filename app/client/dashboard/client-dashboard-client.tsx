"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2, Wallet } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrencyPHPRounded, formatDate } from "@/lib/presentation/formatters"

interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: { message: string } | null
}

interface ClientProfile {
  id: string
  firstName: string
  lastName: string
}

interface Loan {
  id: string
  status: string
  outstandingBalance: string
  totalPaid: string
  totalPayable: string
}

interface Payment {
  id: string
  loanId: string
  paymentDate: string
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const payload = (await res.json()) as ApiResponse<T>
  if (!res.ok || !payload.success || payload.data === null) {
    throw new Error(payload.error?.message ?? "Request failed.")
  }
  return payload.data
}

export function ClientDashboardClient() {
  const dashboardQuery = useQuery({
    queryKey: ["client", "dashboard"],
    queryFn: () => fetchJson<{ client: ClientProfile }>("/api/client/dashboard"),
  })

  const loansQuery = useQuery({
    queryKey: ["client", "loans"],
    queryFn: () => fetchJson<Loan[]>("/api/client/loans"),
  })

  const paymentsQuery = useQuery({
    queryKey: ["client", "payments"],
    queryFn: () => fetchJson<Payment[]>("/api/client/payments"),
  })

  const loading = dashboardQuery.isLoading || loansQuery.isLoading || paymentsQuery.isLoading

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const client = dashboardQuery.data?.client
  const loans = loansQuery.data ?? []
  const payments = paymentsQuery.data ?? []

  function lastPaymentDateForLoan(loanId: string) {
    // payments are pre-sorted desc by paymentDate, so the first match is the latest
    const match = payments.find((payment) => payment.loanId === loanId)
    return match ? formatDate(match.paymentDate) : "No payments yet"
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {client ? `${client.firstName} ${client.lastName}` : "My Loans"}
        </h1>
        <p className="text-muted-foreground">Your loan balances and payment history.</p>
      </div>

      {loans.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No loans on record.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {loans.map((loan) => {
            const percentPaid = Math.min(
              100,
              Math.round((Number(loan.totalPaid) / Number(loan.totalPayable)) * 100),
            )
            return (
              <Card key={loan.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Wallet className="h-4 w-4 text-primary" />
                    Loan
                  </CardTitle>
                  <Badge variant={loan.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px] h-5">
                    {loan.status}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold tracking-tight text-primary">
                      {formatCurrencyPHPRounded(loan.outstandingBalance)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Paid</p>
                      <span className="text-xs font-bold text-primary">{percentPaid}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Last Payment</p>
                    <p className="text-sm font-medium">{lastPaymentDateForLoan(loan.id)}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
