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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { listClients, deactivateClient, getClientById, updateClient } from "@/lib/actions/admin/clients"

type ClientRow = {
  id: string
  firstName: string
  lastName: string
  contactNumber: string | null
  address?: string | null
  idType?: string | null
  idNumber?: string | null
  isActive: boolean
  createdAt: Date | string
}

type ClientUpdateInput = {
  firstName: string
  lastName: string
  contactNumber?: string
  address?: string
  idType?: string
  idNumber?: string
}

export function ClientListClient() {
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  
  const [pendingDeactivateClient, setPendingDeactivateClient] = React.useState<ClientRow | null>(null)
  const [editingClientId, setEditingClientId] = React.useState<string | null>(null)
  
  const [editError, setEditError] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    address: "",
    idType: "",
    idNumber: "",
  })

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

  const clientsQuery = useQuery({
    queryKey: ["admin", "clients", { status, search: debouncedSearch }],
    queryFn: async () => {
      const res = await listClients({
        page: 1,
        pageSize: 50,
        status,
        search: debouncedSearch
      })
      if (!res.success) throw new Error(res.error)
      return res.data
    }
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await deactivateClient(id)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] })
      setPendingDeactivateClient(null)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ClientUpdateInput }) => {
      const res = await updateClient(id, data)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "clients"] })
      setEditingClientId(null)
    }
  })

  const clientDetailQuery = useQuery({
    queryKey: ["admin", "clients", editingClientId],
    queryFn: async () => {
      if (!editingClientId) return null
      const res = await getClientById(editingClientId)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    enabled: !!editingClientId
  })

  const loading = clientsQuery.isLoading
  const clients: ClientRow[] = clientsQuery.data?.rows ?? []

  function handleDeactivate(client: ClientRow) {
    if (!client.isActive) return
    deactivateMutation.mutate(client.id)
  }

  function handleSaveEdit() {
    if (!editingClientId) return
    setEditError(null)
    updateMutation.mutate({
      id: editingClientId,
      data: {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        contactNumber: editForm.contactNumber.trim() || undefined,
        address: editForm.address.trim() || undefined,
        idType: editForm.idType.trim() || undefined,
        idNumber: editForm.idNumber.trim() || undefined,
      }
    }, {
      onError: (err) => {
        setEditError(err instanceof Error ? err.message : "Failed to update client.")
      }
    })
  }

  const openEditDialog = async (id: string) => {
    setEditError(null)
    setEditingClientId(id)
    const res = await getClientById(id)
    if (!res.success) {
      setEditError(res.error)
      return
    }
    const data = res.data
    setEditForm({
      firstName: data.firstName ?? "",
      lastName: data.lastName ?? "",
      contactNumber: data.contactNumber ?? "",
      address: data.address ?? "",
      idType: data.idType ?? "",
      idNumber: data.idNumber ?? "",
    })
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
                            <DropdownMenuItem onClick={() => void openEditDialog(client.id)}>
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setPendingDeactivateClient(client)}
                              disabled={!client.isActive || deactivateMutation.isPending}
                            >
                              {deactivateMutation.isPending && deactivateMutation.variables === client.id ? "Deactivating..." : "Deactivate"}
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
          if (!open && !deactivateMutation.isPending) {
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
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDeactivateClient && handleDeactivate(pendingDeactivateClient)}
              disabled={!pendingDeactivateClient || deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingClientId)}
        onOpenChange={(open) => {
          if (!open && !updateMutation.isPending) {
            setEditingClientId(null)
            setEditError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
            <DialogDescription>Update borrower profile information.</DialogDescription>
          </DialogHeader>
          {clientDetailQuery.isLoading ? (
            <div className="py-6 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-first-name">First Name</Label>
                  <Input
                    id="edit-first-name"
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, firstName: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-last-name">Last Name</Label>
                  <Input
                    id="edit-last-name"
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, lastName: event.target.value }))}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-contact-number">Contact Number</Label>
                <Input
                  id="edit-contact-number"
                  value={editForm.contactNumber}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, contactNumber: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={editForm.address}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, address: event.target.value }))}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-id-type">ID Type</Label>
                  <Input
                    id="edit-id-type"
                    value={editForm.idType}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, idType: event.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="edit-id-number">ID Number</Label>
                  <Input
                    id="edit-id-number"
                    value={editForm.idNumber}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, idNumber: event.target.value }))}
                  />
                </div>
              </div>
              {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingClientId(null)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={clientDetailQuery.isLoading || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
