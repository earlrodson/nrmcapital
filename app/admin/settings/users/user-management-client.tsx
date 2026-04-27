"use client"

import * as React from "react"
import { 
  Plus, 
  MoreHorizontal, 
  Pencil, 
  Key, 
  CheckCircle2, 
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from "@/lib/actions/admin/users"

interface User {
  id: string
  email: string
  name: string
  role: "SUPERADMIN" | "ADMIN" | "CLIENT"
  isActive: boolean
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

export function UserManagementClient() {
  const queryClient = useQueryClient()
  const [pagination, setPagination] = React.useState<Pagination>({ page: 1, pageSize: 10, total: 0 })
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [resetTargetUser, setResetTargetUser] = React.useState<User | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Form states
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN" as User["role"],
  })
  const [resetPasswordData, setResetPasswordData] = React.useState({
    password: "",
    confirmPassword: "",
  })

  const usersQuery = useQuery({
    queryKey: ["admin", "users", { page: pagination.page, pageSize: pagination.pageSize }],
    queryFn: async () => {
      const res = await listUsers({ page: pagination.page, pageSize: pagination.pageSize })
      if (!res.success) throw new Error(res.error)
      return res.data
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (input: { name: string; email: string; password: string; role: User["role"] }) => {
      const res = await createUser(input)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: async () => {
      setIsCreateDialogOpen(false)
      setFormData({ name: "", email: "", password: "", role: "ADMIN" })
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: async (input: { id: string; data: { name: string; role: User["role"]; isActive?: boolean } }) => {
      const res = await updateUser(input.id, input.data)
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: async () => {
      setIsEditDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: async (input: { id: string; password: string }) => {
      const res = await resetUserPassword(input.id, { password: input.password })
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    onSuccess: () => {
      alert("Password reset successfully")
      setIsResetDialogOpen(false)
      setResetTargetUser(null)
      setResetPasswordData({ password: "", confirmPassword: "" })
    },
  })

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await createUserMutation.mutateAsync(formData)
    } catch {
      setError("An error occurred while creating user")
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    setError(null)
    try {
      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        data: {
          name: formData.name,
          role: formData.role,
        },
      })
    } catch {
      setError("An error occurred while updating user")
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        data: {
          isActive: !user.isActive,
          name: user.name,
          role: user.role,
        },
      })
    } catch {
      alert("An error occurred while updating status")
    }
  }

  const openResetDialog = (user: User) => {
    setResetTargetUser(user)
    setResetPasswordData({ password: "", confirmPassword: "" })
    setError(null)
    setIsResetDialogOpen(true)
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetTargetUser) return

    const password = resetPasswordData.password.trim()
    const confirmPassword = resetPasswordData.confirmPassword.trim()

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.")
      return
    }

    setError(null)
    try {
      await resetPasswordMutation.mutateAsync({ id: resetTargetUser.id, password })
    } catch {
      alert("An error occurred while resetting password")
    }
  }

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    })
    setIsEditDialogOpen(true)
  }

  const users = usersQuery.data?.rows ?? []
  const total = usersQuery.data?.total ?? 0
  const isLoading = usersQuery.isLoading
  const isSubmitting =
    createUserMutation.isPending || updateUserMutation.isPending || resetPasswordMutation.isPending
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Users</h2>
          <p className="text-muted-foreground">
            Manage system users and their permissions.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger
            render={
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            }
          />
          <DialogContent>
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Enter user details to create a new account.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="SUPERADMIN">Super Admin</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === "SUPERADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs font-medium">Active</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Inactive</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                            {user.isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openResetDialog(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="text-sm font-medium">Page {pagination.page} of {totalPages}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(totalPages, prev.page + 1) }))}
            disabled={pagination.page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateUser}>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update the profile and role for {selectedUser?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email (Cannot be changed)</Label>
                <Input value={formData.email} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-role">Role</Label>
                <select
                  id="edit-role"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as User["role"] })}
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="CLIENT">Client</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isResetDialogOpen}
        onOpenChange={(open) => {
          setIsResetDialogOpen(open)
          if (!open) {
            setResetTargetUser(null)
            setResetPasswordData({ password: "", confirmPassword: "" })
          }
        }}
      >
        <DialogContent>
          <form onSubmit={handleResetPassword}>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetTargetUser?.email}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordData.password}
                  onChange={(e) =>
                    setResetPasswordData((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reset-confirm-password">Confirm Password</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
