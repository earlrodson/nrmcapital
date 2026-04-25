"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, Briefcase, CreditCard, Loader2, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface SummaryData {
  totalPayments: string
  activeLoans: number
  activeMembers: number
  overduePayments: number
  cashAvailable: string
}

interface OverviewPoint {
  bucket: string
  total: string
}

type OverviewGranularity = "day" | "month" | "year"

interface ActivityItem {
  id: string
  type: string
  action: string
  entityId: string
  createdAt: string
  actorName: string | null
  title: string
  description: string
}

interface OverdueLoanItem {
  loanId: string
  clientId: string
  firstName: string
  lastName: string
  overdueTerms: number
  oldestDueDate: string
  overdueAmount: string
  daysOverdue: number
}

function formatCurrency(value: string) {
  const amount = Number(value || "0")
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

function overviewLabel(bucket: string, granularity: OverviewGranularity) {
  if (granularity === "year") return bucket
  if (granularity === "day") {
    const parsed = new Date(`${bucket}T00:00:00`)
    if (Number.isNaN(parsed.getTime())) return bucket
    return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  const [year, month] = bucket.split("-")
  const parsed = new Date(Number(year), Number(month) - 1, 1)
  if (Number.isNaN(parsed.getTime())) return bucket
  return parsed.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
}

function buildLinePath(data: number[], width: number, height: number, padding: number) {
  if (data.length === 0) return ""
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0

  return data
    .map((value, index) => {
      const x = padding + stepX * index
      const y = padding + (height - padding * 2) * (1 - (value - min) / range)
      return `${index === 0 ? "M" : "L"}${x},${y}`
    })
    .join(" ")
}

function buildPlotPoints(data: number[], width: number, height: number, padding: number) {
  if (data.length === 0) return []
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0

  return data.map((value, index) => {
    const x = padding + stepX * index
    const y = padding + (height - padding * 2) * (1 - (value - min) / range)
    return { x, y, value }
  })
}

export function DashboardClient() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [overviewError, setOverviewError] = React.useState<string | null>(null)
  const [overviewLoading, setOverviewLoading] = React.useState(false)
  const [summary, setSummary] = React.useState<SummaryData | null>(null)
  const [overview, setOverview] = React.useState<OverviewPoint[]>([])
  const [overviewGranularity, setOverviewGranularity] = React.useState<OverviewGranularity>("month")
  const [activity, setActivity] = React.useState<ActivityItem[]>([])
  const [topOverdue, setTopOverdue] = React.useState<OverdueLoanItem[]>([])

  React.useEffect(() => {
    let active = true
    async function loadDashboard() {
      setLoading(true)
      setError(null)
      try {
        const [summaryRes, activityRes, overdueRes] = await Promise.all([
          fetch("/api/admin/dashboard/summary"),
          fetch("/api/admin/dashboard/activity?limit=10"),
          fetch("/api/admin/dashboard/overdue-top?limit=5"),
        ])

        const [summaryPayload, activityPayload, overduePayload] = await Promise.all([
          summaryRes.json(),
          activityRes.json(),
          overdueRes.json(),
        ])

        if (!active) return
        if (!summaryPayload.success || !activityPayload.success || !overduePayload.success) {
          setError("Failed to load dashboard data.")
          return
        }

        setSummary(summaryPayload.data)
        setActivity(activityPayload.data ?? [])
        setTopOverdue(overduePayload.data ?? [])
      } catch {
        if (!active) return
        setError("Unable to fetch dashboard data.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadDashboard()
    return () => {
      active = false
    }
  }, [])

  React.useEffect(() => {
    let active = true
    async function loadOverview() {
      setOverviewLoading(true)
      setOverviewError(null)
      try {
        const overviewRes = await fetch(`/api/admin/dashboard/overview?granularity=${overviewGranularity}`)
        const overviewPayload = await overviewRes.json()
        if (!active) return
        if (!overviewPayload.success) {
          setOverviewError("Failed to load overview data.")
          setOverview([])
          return
        }
        setOverview(overviewPayload.data ?? [])
      } catch {
        if (!active) return
        setOverviewError("Failed to load overview data.")
        setOverview([])
      } finally {
        if (active) setOverviewLoading(false)
      }
    }

    void loadOverview()
    return () => {
      active = false
    }
  }, [overviewGranularity])

  const totals = overview.map((entry) => Number(entry.total || "0"))
  const linePath = buildLinePath(totals, 720, 240, 24)
  const plotPoints = buildPlotPoints(totals, 720, 240, 24)
  const overviewDescription =
    overviewGranularity === "day"
      ? "Daily repayment collections for the last 30 days."
      : overviewGranularity === "year"
        ? "Yearly repayment collections for the last 10 years."
        : "Monthly repayment collections over the last 12 months."

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error || "Dashboard data is unavailable."}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, Admin</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your lending platform today.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalPayments)}</div>
            <p className="text-xs text-muted-foreground">All recorded payment collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeLoans}</div>
            <p className="text-xs text-muted-foreground">Loans currently in active status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeMembers}</div>
            <p className="text-xs text-muted-foreground">Clients with active status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Overdue Payments</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{summary.overduePayments}</div>
            <p className="text-xs text-muted-foreground">Unpaid schedules past due date</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border bg-muted/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">Cash Available</p>
        <p className="text-xl font-semibold">{formatCurrency(summary.cashAvailable)}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Overview</CardTitle>
                <CardDescription>{overviewDescription}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={overviewGranularity === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOverviewGranularity("day")}
                >
                  Daily
                </Button>
                <Button
                  type="button"
                  variant={overviewGranularity === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOverviewGranularity("month")}
                >
                  Monthly
                </Button>
                <Button
                  type="button"
                  variant={overviewGranularity === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setOverviewGranularity("year")}
                >
                  Yearly
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="border-t border-dashed bg-muted/20 p-4">
            {overviewLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading overview data...
              </div>
            ) : overviewError ? (
              <p className="text-sm text-destructive">{overviewError}</p>
            ) : overview.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overview data available yet.</p>
            ) : (
              <div className="space-y-3">
                <svg viewBox="0 0 720 240" className="w-full h-56 rounded-md bg-background/70">
                  <path d={linePath} fill="none" stroke="currentColor" strokeWidth="3" className="text-primary" />
                  {plotPoints.map((point, index) => {
                    const entry = overview[index]
                    if (!entry) return null
                    const label = overviewLabel(entry.bucket, overviewGranularity)
                    return (
                      <circle key={entry.bucket} cx={point.x} cy={point.y} r={4} className="fill-primary stroke-background" strokeWidth={2}>
                        <title>{`${label}: ${formatCurrency(entry.total)}`}</title>
                      </circle>
                    )
                  })}
                </svg>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {overview.map((entry) => (
                    <span key={entry.bucket}>
                      {overviewLabel(entry.bucket, overviewGranularity)}: {formatCurrency(entry.total)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 rounded-md border bg-background/80 p-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Top Overdue Loans</p>
              {topOverdue.length === 0 ? (
                <p className="text-xs text-muted-foreground">No overdue loans at the moment.</p>
              ) : (
                <div className="space-y-2">
                  {topOverdue.map((item) => (
                    <div key={item.loanId} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                      <Link href={`/admin/clients/${item.clientId}`} className="min-w-0">
                        <p className="truncate font-medium">
                          {item.firstName} {item.lastName} • #{item.loanId.slice(0, 8)}
                        </p>
                      </Link>
                      <span className="text-muted-foreground">{item.daysOverdue}d</span>
                      <span className="font-semibold">{formatCurrency(item.overdueAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest client, loan, payment, and funding events.</CardDescription>
            </div>
            <Link href="/admin/dashboard/activity" className="text-xs text-primary hover:underline">
              See all
            </Link>
          </CardHeader>
          <CardContent className="border-t border-dashed bg-muted/20 p-0">
            {activity.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <div className="divide-y divide-border">
                {activity.slice(0, 10).map((event) => (
                  <div key={event.id} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.title}</p>
                      <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{event.description || "No details provided."}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {event.actorName || "System"} • {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
