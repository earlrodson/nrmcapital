"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

interface ActivityResponse {
  success: boolean
  data: ActivityItem[]
  meta?: {
    page: number
    pageSize: number
    total: number
  }
}

export function ActivityListClient() {
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [rows, setRows] = React.useState<ActivityItem[]>([])
  const [total, setTotal] = React.useState(0)
  const pageSize = 20

  React.useEffect(() => {
    let active = true
    async function loadActivity() {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/dashboard/activity?page=${page}&pageSize=${pageSize}`)
        const payload: ActivityResponse = await res.json()
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

    void loadActivity()
    return () => {
      active = false
    }
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recent Activity</h1>
        <p className="text-muted-foreground">All dashboard activity events across clients, loans, payments, and funding.</p>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Event</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No activity found.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.description || "No details provided."}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{event.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{event.actorName || "System"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {Math.min(page, totalPages)} of {totalPages} ({total} events)
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading}>
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages || loading}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
