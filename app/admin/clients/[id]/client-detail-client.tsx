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
import {
  getClientById,
  listClientAttachments,
  listClientLoans,
  updateClient,
} from "@/lib/actions/admin/clients"
import { getLoanSchedule } from "@/lib/actions/admin/loans"
import { formatAmount, formatDate } from "@/lib/presentation/formatters"
import { getRepaymentStatusBadge, type RepaymentStatus } from "@/lib/presentation/status"

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
  createdAt: string | Date
}

interface LoanData {
  id: string
  loanType: string
  principalAmount: string
  outstandingBalance: string
  totalPaid: string
  totalPayable: string
  months: number
  loanDate: string | Date
  status: string
}

interface ScheduleTerm {
  id: string
  termNumber: number
  dueDate: string | Date
  amountDue: string
  principalDue: string
  interestDue: string
  amountPaid: string
  remainingAmount?: string
  effectiveAmountPaid?: string
  effectiveRemainingAmount?: string
  isPaid: boolean
}

interface AttachmentData {
  id: string
  fileName: string | null
  type: string
}

function getTermStatus(term: ScheduleTerm): RepaymentStatus {
  const amountDue = Number(term.amountDue || "0")
  const amountPaid = Number(term.effectiveAmountPaid ?? term.amountPaid ?? "0")
  const remaining = Number(term.effectiveRemainingAmount ?? Math.max(0, amountDue - amountPaid))

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
          getClientById(clientId),
          listClientLoans(clientId),
          listClientAttachments(clientId),
        ])

        if (!clientRes.success) throw new Error(clientRes.error || "Failed to load client profile")
        if (!loansRes.success) throw new Error(loansRes.error || "Failed to load client loans")
        if (!attachmentsRes.success) throw new Error(attachmentsRes.error || "Failed to load attachments")

        // Get the most recent loan for detail view
        const activeLoan = loansRes.data?.[0] || null
        let scheduleData: ScheduleTerm[] = []
        
        if (activeLoan) {
          const scheduleRes = await getLoanSchedule(activeLoan.id)
          if (!scheduleRes.success) {
            throw new Error(scheduleRes.error || "Failed to load loan schedule")
          }
          scheduleData = Array.isArray(scheduleRes.data) ? scheduleRes.data : []
        }

        setData({
          client: clientRes.data,
          loan: activeLoan,
          schedule: scheduleData,
          attachments: attachmentsRes.data || [],
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
      const result = await updateClient(clientId, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        contactNumber: editForm.contactNumber.trim() || undefined,
        address: editForm.address.trim() || undefined,
        idType: editForm.idType.trim() || undefined,
        idNumber: editForm.idNumber.trim() || undefined,
      })
      if (!result.success) {
        setEditError(result.error || "Failed to update borrower profile.")
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
            <span>Registered on {formatDate(client.createdAt)}</span>
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
                      {loan.loanType} interest • Released on {formatDate(loan.loanDate)}
                    </CardDescription>
                  </div>
                  <Badge variant={loan.status === "ACTIVE" ? "default" : "outline"} className="px-3 py-1">
                    {loan.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Principal</p>
                      <p className="text-lg font-bold tracking-tight">₱{loan.principalAmount}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Outstanding</p>
                      <p className="text-lg font-bold tracking-tight text-primary">₱{loan.outstandingBalance}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Paid</p>
                      <p className="text-lg font-bold tracking-tight text-green-600">₱{loan.totalPaid}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Duration</p>
                      <p className="text-lg font-bold tracking-tight">{loan.months} Months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Repayment Progress
                    </CardTitle>
                    <span className="text-sm font-bold text-primary">
                      {Math.min(100, Math.round((Number(loan.totalPaid) / Number(loan.totalPayable)) * 100))}%
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-in-out"
                      style={{ width: `${Math.min(100, (Number(loan.totalPaid) / Number(loan.totalPayable)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                    <div className="space-y-0.5">
                      <p>Total Repaid</p>
                      <p className="text-sm text-foreground">₱{formatAmount(loan.totalPaid)}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p>Remaining Balance</p>
                      <p className="text-sm text-foreground">₱{formatAmount(loan.outstandingBalance)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Full Width Repayment Schedule */}
      {loan && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Repayment Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[80px]">Term</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amortization</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Principal</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Interest</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((term) => {
                  const status = getTermStatus(term)
                  const amountDue = Number(term.amountDue || "0")
                  const amountPaid = Number(term.effectiveAmountPaid ?? term.amountPaid ?? "0")
                  const remainingAmount = Number(term.effectiveRemainingAmount ?? term.remainingAmount ?? Math.max(0, amountDue - amountPaid))
                  return (
                  <TableRow key={term.id} className={status === "PAID" ? "bg-green-50/30 dark:bg-green-950/10" : ""}>
                    <TableCell className="font-mono text-[10px]">{term.termNumber}</TableCell>
                    <TableCell className="text-xs font-medium whitespace-nowrap">{formatDate(term.dueDate)}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">₱{term.amountDue}</TableCell>
                    <TableCell className="text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">₱{term.principalDue}</TableCell>
                    <TableCell className="text-right text-muted-foreground hidden sm:table-cell whitespace-nowrap">₱{term.interestDue}</TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">₱{formatAmount(amountPaid)}</TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">₱{formatAmount(remainingAmount)}</TableCell>
                    <TableCell className="text-center">
                      <Badge {...getRepaymentStatusBadge(status)}>
                        {status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
