"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getDashboardActivity } from "@/lib/actions/admin/dashboard"

type ActivityItem = {
  id: string
  title: string
  type: string
  actorName: string | null
  description: string | null
  createdAt: string | Date
}

export function ActivityListClient() {
  const [page, setPage] = React.useState(1)
  const pageSize = 20

  const activityQuery = useQuery({
    queryKey: ["admin", "dashboard", "activity", { page, pageSize }],
    queryFn: async () => {
      const res = await getDashboardActivity({ page, pageSize })
      if (!res.success) throw new Error(res.error)
      return res.data
    }
  })

  const loading = activityQuery.isLoading
  const rows: ActivityItem[] = activityQuery.data?.rows ?? []
  const total = activityQuery.data?.total ?? 0
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
