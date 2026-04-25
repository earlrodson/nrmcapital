"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Eye, Loader2, ReceiptText, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface LoanRow {
  loans: {
    id: string
    principalAmount: string
    totalPayable: string
    outstandingBalance: string
    paymentFrequency: string
    loanDate: string
    expectedEndDate: string
    status: "ACTIVE" | "COMPLETED" | "DEFAULTED"
  }
  clients: {
    id: string
    firstName: string
    lastName: string
    contactNumber: string | null
  }
}

interface LoanSchedule {
  id: string
  termNumber: number
  dueDate: string
  amountDue: string
  amountPaid?: string
  remainingAmount?: string
  effectiveAmountPaid?: string
  effectiveRemainingAmount?: string
  isPaid: boolean
}

interface LoanPayment {
  id: string
  amount: string
  paymentDate: string
  paymentType: string
  paymentMethod: string
}

interface LoanDetails {
  id: string
  loanType: string
  monthlyInterestRate: string
  months: number
  termsPerMonth: number
  totalTerms: number
  totalPayable: string
  totalPaid: string
  notes: string | null
}

interface LoansResponse {
  success: boolean
  data: LoanRow[]
  meta?: {
    page: number
    pageSize: number
    total: number
    summary?: {
      totalOutstanding: string
      activeLoans: number
      overdueLoans: number
      collectedThisMonth: string
    }
  }
}

type RepaymentStatus = "UPCOMING" | "DUE" | "PARTIAL" | "OVERDUE" | "PAID"

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Defaulted", value: "defaulted" },
  { label: "Overdue", value: "overdue" },
] as const

const SORT_OPTIONS = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Outstanding (High-Low)", value: "outstandingBalance:desc" },
  { label: "Outstanding (Low-High)", value: "outstandingBalance:asc" },
  { label: "Loan Date (Newest)", value: "loanDate:desc" },
  { label: "Loan Date (Oldest)", value: "loanDate:asc" },
  { label: "End Date (Soonest)", value: "expectedEndDate:asc" },
] as const

function formatCurrency(value: string) {
  const amount = Number(value || "0")
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

function buildQueryString(searchParams: URLSearchParams, updates: Record<string, string | null>) {
  const params = new URLSearchParams(searchParams.toString())
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) params.delete(key)
    else params.set(key, value)
  })
  return params.toString()
}

function getTermStatus(term: LoanSchedule): RepaymentStatus {
  const amountDue = Number(term.amountDue || "0")
  const amountPaid = Number(term.effectiveAmountPaid ?? term.amountPaid ?? "0")
  const remaining = Number(term.effectiveRemainingAmount ?? term.remainingAmount ?? Math.max(0, amountDue - amountPaid))

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

export function LoanListClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [loading, setLoading] = React.useState(true)
  const [rows, setRows] = React.useState<LoanRow[]>([])
  const [meta, setMeta] = React.useState<LoansResponse["meta"]>()
  const [search, setSearch] = React.useState(searchParams.get("search") ?? "")
  const [selectedLoanId, setSelectedLoanId] = React.useState<string | null>(null)
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  const [loanDetails, setLoanDetails] = React.useState<LoanDetails | null>(null)
  const [loanSchedule, setLoanSchedule] = React.useState<LoanSchedule[]>([])
  const [loanPayments, setLoanPayments] = React.useState<LoanPayment[]>([])

  const status = searchParams.get("status") ?? "all"
  const page = Number(searchParams.get("page") ?? "1")
  const sortBy = searchParams.get("sortBy") ?? "createdAt"
  const sortOrder = searchParams.get("sortOrder") ?? "desc"
  const sortValue = `${sortBy}:${sortOrder}`
  const searchQuery = searchParams.get("search") ?? ""

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim()
      const current = searchParams.get("search") ?? ""
      if (trimmed === current) return
      const nextQuery = buildQueryString(new URLSearchParams(searchParams.toString()), {
        search: trimmed || null,
        page: "1",
      })
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    }, 300)
    return () => clearTimeout(timeout)
  }, [pathname, router, search, searchParams])

  React.useEffect(() => {
    const controller = new AbortController()
    async function loadLoans() {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        query.set("page", String(page > 0 ? page : 1))
        query.set("pageSize", "20")
        if (status !== "all") query.set("status", status)
        if (searchQuery) query.set("search", searchQuery)
        query.set("sortBy", sortBy)
        query.set("sortOrder", sortOrder)

        const response = await fetch(`/api/admin/loans?${query.toString()}`, { signal: controller.signal })
        const payload: LoansResponse = await response.json()
        if (payload.success) {
          setRows(payload.data)
          setMeta(payload.meta)
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("Failed to load loans", error)
      } finally {
        setLoading(false)
      }
    }

    loadLoans()
    return () => controller.abort()
  }, [page, searchQuery, sortBy, sortOrder, status])

  React.useEffect(() => {
    if (!selectedLoanId) return

    let active = true
    async function loadDetails() {
      setDetailsLoading(true)
      try {
        const [detailRes, scheduleRes, paymentsRes] = await Promise.all([
          fetch(`/api/admin/loans/${selectedLoanId}`),
          fetch(`/api/admin/loans/${selectedLoanId}/schedule`),
          fetch(`/api/admin/loans/${selectedLoanId}/payments`),
        ])
        const [detailData, scheduleData, paymentsData] = await Promise.all([
          detailRes.json(),
          scheduleRes.json(),
          paymentsRes.json(),
        ])

        if (!active) return
        setLoanDetails(detailData.data ?? null)
        setLoanSchedule(scheduleData.data ?? [])
        setLoanPayments(paymentsData.data ?? [])
      } catch (error) {
        console.error("Failed to load loan details", error)
      } finally {
        if (active) setDetailsLoading(false)
      }
    }

    loadDetails()
    return () => {
      active = false
    }
  }, [selectedLoanId])

  function setFilter(values: Record<string, string | null>) {
    const nextQuery = buildQueryString(new URLSearchParams(searchParams.toString()), values)
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const total = meta?.total ?? 0
  const pageSize = meta?.pageSize ?? 20
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Loans</h1>
          <p className="text-muted-foreground">Track borrower loans, repayments, and overdue risk.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(meta?.summary?.totalOutstanding ?? "0")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{meta?.summary?.activeLoans ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{meta?.summary?.overdueLoans ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(meta?.summary?.collectedThisMonth ?? "0")}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search loan ID, borrower, or contact number..."
            className="pl-10"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={sortValue}
          onChange={(event) => {
            const [nextSortBy, nextSortOrder] = event.target.value.split(":")
            setFilter({ sortBy: nextSortBy, sortOrder: nextSortOrder, page: "1" })
          }}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={status === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter({ status: option.value === "all" ? null : option.value, page: "1" })}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Loan</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Loan Date</TableHead>
              <TableHead>Expected End</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading loans...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                  No loans found for the current filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.loans.id}>
                  <TableCell className="font-mono text-xs">#{row.loans.id.split("-")[0]}</TableCell>
                  <TableCell>
                    <div className="font-medium">{row.clients.firstName} {row.clients.lastName}</div>
                    <div className="text-xs text-muted-foreground">{row.clients.contactNumber || "No contact"}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.loans.status === "ACTIVE" ? "default" : "secondary"}>
                      {row.loans.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.loans.principalAmount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(row.loans.outstandingBalance)}</TableCell>
                  <TableCell>{new Date(row.loans.loanDate).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(row.loans.expectedEndDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="sm">Actions</Button>}
                      />
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Loan Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setSelectedLoanId(row.loans.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem render={<Link href={`/admin/payments/new?loanId=${row.loans.id}`} />}>
                            <ReceiptText className="mr-2 h-4 w-4" />
                            Record Payment
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages} ({total} total loans)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ page: String(Math.max(1, page - 1)) })}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ page: String(Math.min(totalPages, page + 1)) })}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedLoanId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLoanId(null)
            setLoanDetails(null)
            setLoanSchedule([])
            setLoanPayments([])
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loan Details</DialogTitle>
            <DialogDescription>View loan terms, repayment schedule, and recent payments.</DialogDescription>
          </DialogHeader>
          {detailsLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : loanDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Type</p>
                  <p className="font-medium">{loanDetails.loanType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Months</p>
                  <p className="font-medium">{loanDetails.months}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Payable</p>
                  <p className="font-medium">{formatCurrency(loanDetails.totalPayable)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Total Paid</p>
                  <p className="font-medium">{formatCurrency(loanDetails.totalPaid)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">Repayment Schedule</p>
                <div className="max-h-48 overflow-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Term</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loanSchedule.slice(0, 8).map((term) => {
                        const status = getTermStatus(term)
                        return (
                          <TableRow key={term.id}>
                            <TableCell>{term.termNumber}</TableCell>
                            <TableCell>{new Date(term.dueDate).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{formatCurrency(term.amountDue)}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={status === "PAID" ? "default" : status === "OVERDUE" ? "destructive" : "outline"}
                                className={
                                  status === "PAID"
                                    ? "bg-green-600 text-[10px]"
                                    : status === "PARTIAL"
                                      ? "border-amber-500 text-amber-600 text-[10px]"
                                      : status === "DUE"
                                        ? "border-blue-500 text-blue-600 text-[10px]"
                                        : "text-[10px]"
                                }
                              >
                                {status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium mb-2">Recent Payments</p>
                <div className="space-y-2">
                  {loanPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded border px-3 py-2 text-xs">
                      <span>{new Date(payment.paymentDate).toLocaleDateString()} • {payment.paymentMethod}</span>
                      <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  {loanPayments.length === 0 && (
                    <p className="text-xs text-muted-foreground">No payments recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load loan details.</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedLoanId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
