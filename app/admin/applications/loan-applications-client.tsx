"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { listLoanApplications, reviewLoanApplication } from "@/lib/actions/admin/applications"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatCurrencyPHP, formatDateTime } from "@/lib/presentation/formatters"

type LoanApplication = {
  id: string
  firstName: string
  lastName: string
  applicantEmail: string
  principalAmount: string
  monthlyInterestRate: string
  months: number
  paymentFrequency: "MONTHLY" | "SEMI_MONTHLY" | "WEEKLY"
  status: "PENDING" | "APPROVED" | "REJECTED"
  rejectionReason: string | null
  reviewedAt: Date | null
  createdAt: Date
}

function buildQueryString(searchParams: URLSearchParams, updates: Record<string, string | null>) {
  const params = new URLSearchParams(searchParams.toString())
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) params.delete(key)
    else params.set(key, value)
  })
  return params.toString()
}

const statusOptions = ["all", "pending", "approved", "rejected"] as const

export function LoanApplicationsClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = searchParams.get("status") ?? "pending"
  const page = Number(searchParams.get("page") ?? "1")
  const searchQuery = searchParams.get("search") ?? ""
  const [search, setSearch] = React.useState(searchQuery)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const trimmed = search.trim()
      if (trimmed === searchQuery) return
      const nextQuery = buildQueryString(new URLSearchParams(searchParams.toString()), { search: trimmed || null, page: "1" })
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname)
    }, 300)
    return () => clearTimeout(timeout)
  }, [search, searchQuery, searchParams, router, pathname])

  const applicationsQuery = useQuery({
    queryKey: ["admin", "loan-applications", { page, status, searchQuery }],
    queryFn: async () => {
      const response = await listLoanApplications({
        page,
        pageSize: 20,
        status,
        search: searchQuery,
      })
      if (!response.success) throw new Error(response.error)
      return response.data
    },
  })

  const rows: LoanApplication[] = applicationsQuery.data?.rows ?? []
  const total = applicationsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  function setFilter(values: Record<string, string | null>) {
    const nextQuery = buildQueryString(new URLSearchParams(searchParams.toString()), values)
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  async function handleReview(id: string, decision: "APPROVED" | "REJECTED") {
    setError(null)
    setBusyId(id)

    const result = await reviewLoanApplication(
      id,
      decision === "APPROVED"
        ? { decision: "APPROVED" }
        : { decision: "REJECTED", rejectionReason: "Rejected after manual assessment." },
    )

    if (!result.success) {
      setError(result.error)
      setBusyId(null)
      return
    }

    await applicationsQuery.refetch()
    setBusyId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Loan Applications</h1>
        <p className="text-muted-foreground">Review pending applications and approve or reject submissions.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Application Queue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10" placeholder="Search by applicant name or email..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <Button key={option} variant={status === option ? "default" : "outline"} size="sm" onClick={() => setFilter({ status: option === "all" ? null : option, page: "1" })}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Loan Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applicationsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">No loan applications found.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => {
                    const busy = busyId === row.id
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <p className="font-medium">{row.firstName} {row.lastName}</p>
                          <p className="text-xs text-muted-foreground">{row.applicantEmail}</p>
                        </TableCell>
                        <TableCell>
                          <p>{formatCurrencyPHP(row.principalAmount)} for {row.months} months</p>
                          <p className="text-xs text-muted-foreground">{row.paymentFrequency} • {row.monthlyInterestRate}% monthly</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">{row.status}</p>
                          {row.rejectionReason ? <p className="text-xs text-destructive">{row.rejectionReason}</p> : null}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          {row.status === "PENDING" ? (
                            <div className="flex justify-end gap-2">
                              <Button size="sm" disabled={busy} onClick={() => handleReview(row.id, "APPROVED")}>Approve</Button>
                              <Button size="sm" variant="destructive" disabled={busy} onClick={() => handleReview(row.id, "REJECTED")}>Reject</Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{row.reviewedAt ? formatDateTime(row.reviewedAt) : "-"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {Math.min(page, totalPages)} of {totalPages} ({total} total)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setFilter({ page: String(page - 1) })}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setFilter({ page: String(page + 1) })}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
