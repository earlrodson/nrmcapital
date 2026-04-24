"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Users,
  Search,
  UserPlus,
  MoreHorizontal,
  Eye,
  Phone,
  Loader2,
  Filter
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ClientListItem {
  id: string
  firstName: string
  lastName: string
  contactNumber: string | null
  isActive: boolean
  createdAt: string
}

export function ClientListClient() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = React.useState(true)
  const [clients, setClients] = React.useState<ClientListItem[]>([])
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [deactivatingClientId, setDeactivatingClientId] = React.useState<string | null>(null)
  const [pendingDeactivateClient, setPendingDeactivateClient] = React.useState<ClientListItem | null>(null)

  const status = React.useMemo(() => {
    const value = searchParams.get("status")
    if (value === "active" || value === "inactive") {
      return value
    }
    return null
  }, [searchParams])

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 300)
    return () => clearTimeout(timeout)
  }, [search])

  React.useEffect(() => {
    const controller = new AbortController()

    async function fetchClients() {
      setLoading(true)
      try {
        const query = new URLSearchParams()
        if (status) query.set("status", status)
        if (debouncedSearch) query.set("search", debouncedSearch)

        const endpoint = query.size > 0 ? `/api/admin/clients?${query.toString()}` : "/api/admin/clients"
        const res = await fetch(endpoint, { signal: controller.signal })
        const data = await res.json()
        if (data.success) {
          setClients(data.data)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }
        console.error("Failed to fetch clients", err)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
    return () => controller.abort()
  }, [status, debouncedSearch])

  async function handleDeactivate(client: ClientListItem) {
    if (!client.isActive || deactivatingClientId) return

    setDeactivatingClientId(client.id)
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, { method: "DELETE" })
      if (!res.ok) {
        throw new Error(`Failed to deactivate client (${res.status})`)
      }

      setClients((previous) => {
        if (status === "active") {
          return previous.filter((item) => item.id !== client.id)
        }
        return previous.map((item) =>
          item.id === client.id ? { ...item, isActive: false } : item
        )
      })
    } catch (error) {
      console.error("Failed to deactivate client", error)
    } finally {
      setDeactivatingClientId(null)
      setPendingDeactivateClient(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client profiles and their active loans.</p>
        </div>
        <Link href="/admin/clients/new">
          <Button className="h-10 px-4">
            <UserPlus className="mr-2 h-4 w-4" />
            New Borrower
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-10 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon-lg" className="h-10 w-10">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Borrower</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Retrieving borrowers...</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No borrowers found matching your search.</p>
                    <Link href="/admin/clients/new">
                      <Button variant="link" size="sm">Create your first borrower</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                        {client.firstName[0]}{client.lastName[0]}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm truncate">{client.firstName} {client.lastName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">#{client.id.split("-")[0]}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" />
                        {client.contactNumber || "N/A"}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.isActive ? "default" : "secondary"} className="text-[10px] h-5">
                      {client.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 swift-transition">
                      <Link href={`/admin/clients/${client.id}`}>
                        <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel>Options</DropdownMenuLabel>
                            <DropdownMenuItem render={<Link href={`/admin/clients/${client.id}`} />}>
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>Edit Details</DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setPendingDeactivateClient(client)}
                              disabled={!client.isActive || deactivatingClientId === client.id}
                            >
                              {deactivatingClientId === client.id ? "Deactivating..." : "Deactivate"}
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={Boolean(pendingDeactivateClient)}
        onOpenChange={(open) => {
          if (!open && !deactivatingClientId) {
            setPendingDeactivateClient(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate borrower?</DialogTitle>
            <DialogDescription>
              {pendingDeactivateClient
                ? `This will move ${pendingDeactivateClient.firstName} ${pendingDeactivateClient.lastName} to inactive clients.`
                : "This action will move the borrower to inactive clients."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingDeactivateClient(null)}
              disabled={Boolean(deactivatingClientId)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDeactivateClient && handleDeactivate(pendingDeactivateClient)}
              disabled={!pendingDeactivateClient || Boolean(deactivatingClientId)}
            >
              {deactivatingClientId ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
