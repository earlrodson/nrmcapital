"use client"

import * as React from "react"
import Link from "next/link"
import { 
  User, 
  Phone, 
  MapPin, 
  IdCard, 
  FileText, 
  CreditCard, 
  Clock,
  AlertCircle,
  Loader2,
  Download
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ClientDetailProps {
  clientId: string
}

interface ClientData {
  id: string
  firstName: string
  lastName: string
  contactNumber: string | null
  address: string | null
  idType: string | null
  idNumber: string | null
  isActive: boolean
  createdAt: string
}

interface LoanData {
  id: string
  loanType: string
  principalAmount: string
  outstandingBalance: string
  totalPaid: string
  months: number
  loanDate: string
  status: string
}

interface ScheduleTerm {
  id: string
  termNumber: number
  dueDate: string
  amountDue: string
  principalDue: string
  interestDue: string
  isPaid: boolean
}

interface AttachmentData {
  id: string
  fileName: string | null
  type: string
}

export function ClientDetailClient({ clientId }: ClientDetailProps) {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<{
    client: ClientData
    loan: LoanData | null
    schedule: ScheduleTerm[]
    attachments: AttachmentData[]
  } | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [editError, setEditError] = React.useState<string | null>(null)
  const [editForm, setEditForm] = React.useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    address: "",
    idType: "",
    idNumber: "",
  })

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [clientRes, loansRes, attachmentsRes] = await Promise.all([
          fetch(`/api/admin/clients/${clientId}`),
          fetch(`/api/admin/clients/${clientId}/loans`),
          fetch(`/api/admin/clients/${clientId}/attachments`)
        ])

        const [clientData, loansData, attachmentsData] = await Promise.all([
          clientRes.json(),
          loansRes.json(),
          attachmentsRes.json()
        ])

        if (!clientData.success) throw new Error("Failed to load client profile")

        // Get the most recent loan for detail view
        const activeLoan = loansData.data?.[0] || null
        let scheduleData = { data: [] }
        
        if (activeLoan) {
          const scheduleRes = await fetch(`/api/admin/loans/${activeLoan.id}/schedule`)
          scheduleData = await scheduleRes.json()
        }

        setData({
          client: clientData.data,
          loan: activeLoan,
          schedule: scheduleData.data,
          attachments: attachmentsData.data || []
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load client data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [clientId])

  const handleDownload = async (attachmentId: string) => {
    try {
      const res = await fetch(`/api/admin/attachments/${attachmentId}/view`)
      const result = await res.json()
      if (result.success) {
        window.open(result.data.viewUrl, "_blank")
      } else {
        alert(result.error?.message || "Failed to retrieve document")
      }
    } catch {
      alert("An error occurred while retrieving the document")
    }
  }

  const openEditDialog = () => {
    if (!data) return
    setEditForm({
      firstName: data.client.firstName,
      lastName: data.client.lastName,
      contactNumber: data.client.contactNumber ?? "",
      address: data.client.address ?? "",
      idType: data.client.idType ?? "",
      idNumber: data.client.idNumber ?? "",
    })
    setEditError(null)
    setIsEditOpen(true)
  }

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!data) return

    setIsSaving(true)
    setEditError(null)
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          contactNumber: editForm.contactNumber.trim() || undefined,
          address: editForm.address.trim() || undefined,
          idType: editForm.idType.trim() || undefined,
          idNumber: editForm.idNumber.trim() || undefined,
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setEditError(result.error?.message || "Failed to update borrower profile.")
        return
      }

      setData((previous) =>
        previous
          ? {
              ...previous,
              client: {
                ...previous.client,
                firstName: result.data.firstName,
                lastName: result.data.lastName,
                contactNumber: result.data.contactNumber,
                address: result.data.address,
                idType: result.data.idType,
                idNumber: result.data.idNumber,
              },
            }
          : previous
      )
      setIsEditOpen(false)
    } catch {
      setEditError("An error occurred while updating borrower profile.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading borrower records...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Error Loading Records</h3>
          <p className="text-sm text-muted-foreground">{error || "Data not found"}</p>
          <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    )
  }

  const { client, loan, schedule, attachments } = data

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{client.firstName} {client.lastName}</h1>
            <Badge variant={client.isActive ? "default" : "secondary"}>
              {client.isActive ? "Active Account" : "Inactive"}
            </Badge>
          </div>
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">ID: {client.id}</span>
            <span>•</span>
            <span>Registered on {new Date(client.createdAt).toLocaleDateString()}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            Edit Profile
          </Button>
          {loan ? (
            <Link href={`/admin/payments/new?loanId=${loan.id}`}>
              <Button size="sm">Record Payment</Button>
            </Link>
          ) : (
            <Button size="sm" disabled>
              Record Payment
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={handleSaveProfile}>
            <DialogHeader>
              <DialogTitle>Edit Borrower Profile</DialogTitle>
              <DialogDescription>Update borrower profile details and save changes.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={editForm.contactNumber}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, contactNumber: event.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={editForm.address}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="idType">ID Type</Label>
                  <Input
                    id="idType"
                    value={editForm.idType}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, idType: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="idNumber">ID Number</Label>
                  <Input
                    id="idNumber"
                    value={editForm.idNumber}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, idNumber: event.target.value }))}
                  />
                </div>
              </div>
            </div>
            {editError ? <p className="text-sm text-destructive">{editError}</p> : null}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Phone Number</p>
                <p className="text-sm flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {client.contactNumber || "Not provided"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">Current Address</p>
                <p className="text-sm flex items-start gap-2">
                  <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                  {client.address || "No address on file"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] uppercase text-muted-foreground font-bold">{client.idType || "Identification"}</p>
                <p className="text-sm flex items-center gap-2">
                  <IdCard className="h-3 w-3 text-muted-foreground" />
                  {client.idNumber || "No ID number recorded"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground italic">
                  No documents uploaded yet.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {attachments.map((attr) => (
                    <div key={attr.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{attr.fileName || "document.pdf"}</p>
                          <p className="text-[10px] text-muted-foreground">{attr.type}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon-xs" 
                        className="opacity-0 group-hover:opacity-100 swift-transition"
                        onClick={() => handleDownload(attr.id)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Loan Info */}
        <div className="lg:col-span-2 space-y-6">
          {!loan ? (
            <Card className="border-dashed flex flex-col items-center justify-center py-12 gap-4">
              <CreditCard className="h-12 w-12 text-muted-foreground/30" />
              <div className="text-center">
                <h3 className="text-lg font-medium">No Active Loans</h3>
                <p className="text-sm text-muted-foreground">This borrower currently has no loan records.</p>
              </div>
              <Button>Create New Loan</Button>
            </Card>
          ) : (
            <>
              <Card className="bg-primary/[0.02] border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 uppercase tracking-tighter">
                      Active Loan: {loan.id.split("-")[0]}
                    </CardTitle>
                    <CardDescription>
                      {loan.loanType} interest • Released on {new Date(loan.loanDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={loan.status === "ACTIVE" ? "default" : "outline"} className="px-3 py-1">
                    {loan.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Principal</p>
                      <p className="text-lg font-bold tracking-tight">₱{loan.principalAmount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Outstanding</p>
                      <p className="text-lg font-bold tracking-tight text-primary">₱{loan.outstandingBalance}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Total Paid</p>
                      <p className="text-lg font-bold tracking-tight text-green-600">₱{loan.totalPaid}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Duration</p>
                      <p className="text-lg font-bold tracking-tight">{loan.months} Months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Repayment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-[80px]">Term</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Amortization</TableHead>
                        <TableHead className="text-right">Principal</TableHead>
                        <TableHead className="text-right">Interest</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schedule.map((term) => (
                        <TableRow key={term.id} className={term.isPaid ? "bg-green-50/30 dark:bg-green-950/10" : ""}>
                          <TableCell className="font-mono text-[10px]">{term.termNumber}</TableCell>
                          <TableCell className="text-xs font-medium">{new Date(term.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right font-semibold">₱{term.amountDue}</TableCell>
                          <TableCell className="text-right text-muted-foreground">₱{term.principalDue}</TableCell>
                          <TableCell className="text-right text-muted-foreground">₱{term.interestDue}</TableCell>
                          <TableCell className="text-center">
                            {term.isPaid ? (
                              <Badge variant="default" className="bg-green-600 text-[10px]">
                                PAID
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                PENDING
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
