"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  UserPlus,
  Calculator,
  FileUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ArrowRight,
  Info
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { calculateLoanTerms } from "@/lib/domain/loan-calculations"
import { createClient, createClientAttachment, getCurrentAdminUser } from "@/lib/actions/admin/clients"
import { createLoan } from "@/lib/actions/admin/loans"

interface AttachmentFile {
  file: File
  type: "GOV_ID" | "PROOF_OF_INCOME" | "PROOF_OF_BILLING" | "CONTRACT" | "OTHER"
  id: string
}

const FREQUENCY_MAP = {
  MONTHLY: 1,
  SEMI_MONTHLY: 2,
  WEEKLY: 4,
} as const

export function NewBorrowerClient() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)

  // Form State - Client
  const [clientData, setClientData] = React.useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    address: "",
    idType: "Driver's License",
    idNumber: "",
    notes: "",
  })

  // Form State - Loan
  const [loanData, setLoanData] = React.useState({
    loanType: "FLAT" as "FLAT" | "DIMINISHING",
    principalAmount: "10000",
    monthlyInterestRate: "5",
    months: 6,
    paymentFrequency: "SEMI_MONTHLY" as keyof typeof FREQUENCY_MAP,
    loanDate: new Date().toISOString().split("T")[0],
    notes: "",
  })

  // Attachments State
  const [attachments, setAttachments] = React.useState<AttachmentFile[]>([])

  // Derived Terms Per Month
  const termsPerMonth = FREQUENCY_MAP[loanData.paymentFrequency]

  // Derived Loan Calculations
  const calculations = React.useMemo(() => {
    try {
      return calculateLoanTerms({
        principalAmount: loanData.principalAmount,
        monthlyInterestRate: loanData.monthlyInterestRate,
        months: loanData.months,
        termsPerMonth: termsPerMonth,
        loanDate: new Date(loanData.loanDate),
      })
    } catch {
      return null
    }
  }, [loanData, termsPerMonth])

  React.useEffect(() => {
    async function loadCurrentUser() {
      const res = await getCurrentAdminUser()
      if (res.success) {
        setCurrentUserId(res.data.userId)
      }
    }
    void loadCurrentUser()
  }, [])

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setClientData(prev => ({ ...prev, [name]: value }))
  }

  const handleLoanChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setLoanData(prev => ({
      ...prev,
      [name]: name === "months" ? parseInt(value) || 0 : value
    }))
  }

  const addAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        type: "OTHER" as const,
        id: Math.random().toString(36).substring(7)
      }))
      setAttachments(prev => [...prev, ...newFiles])
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const updateAttachmentType = (id: string, type: AttachmentFile["type"]) => {
    setAttachments(prev => prev.map(a => a.id === id ? { ...a, type } : a))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId) {
      setError("Unable to identify current user. Please try logging in again.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      // 1. Upload Attachments to R2
      const uploadedAttachments = []
      if (attachments.length > 0) {
        try {
          for (const attr of attachments) {
            const formData = new FormData()
            formData.append("file", attr.file)
            formData.append("folder", "attachments")

            const uploadApiRes = await fetch("/api/admin/upload/file", {
              method: "POST",
              body: formData,
            })

            const uploadApiData = await uploadApiRes.json()
            if (uploadApiRes.status === 503) throw new Error("R2_NOT_CONFIGURED")
            if (!uploadApiData.success) throw new Error(`Upload failed for ${attr.file.name}`)

            const { storageKey } = uploadApiData.data
            uploadedAttachments.push({ storageKey, type: attr.type, fileName: attr.file.name })
          }
        } catch (uploadErr) {
          const message = uploadErr instanceof Error ? uploadErr.message : "Upload error"
          if (message !== "R2_NOT_CONFIGURED") {
            if (!confirm(`Warning: Document upload failed (${message}). Continue anyway?`)) {
              setIsSubmitting(false)
              return
            }
          }
        }
      }

      // 2. Create Client
      const clientResult = await createClient(clientData)
      if (!clientResult.success) throw new Error(clientResult.error || "Failed to create client")
      const clientId = clientResult.data.id

      // 3. Create Loan
      const loanResult = await createLoan({
        clientId,
        ...loanData,
        termsPerMonth,
        loanDate: new Date(loanData.loanDate),
        principalAmount: parseFloat(loanData.principalAmount),
        monthlyInterestRate: parseFloat(loanData.monthlyInterestRate),
        createdById: currentUserId,
      })
      if (!loanResult.success) throw new Error(loanResult.error || "Failed to create loan")

      // 4. Save Metadata
      for (const attr of uploadedAttachments) {
        await createClientAttachment({
          clientId,
          uploadedById: currentUserId,
          storageKey: attr.storageKey,
          type: attr.type,
          fileName: attr.fileName,
        })
      }

      router.push(`/admin/clients/${clientId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Borrower Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">Complete the information below to register a new client and initiate their first loan.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content - Left */}
        <div className="lg:col-span-8 space-y-6">

          {/* Section: Borrower Profile */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">1. Borrower Profile</h2>
            </div>

            <Card className="shadow-sm border-border/60 bg-background/50 backdrop-blur-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">First Name</Label>
                    <Input id="firstName" name="firstName" required value={clientData.firstName} onChange={handleClientChange} placeholder="e.g. Juan" className="h-10 bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Last Name</Label>
                    <Input id="lastName" name="lastName" required value={clientData.lastName} onChange={handleClientChange} placeholder="e.g. Dela Cruz" className="h-10 bg-background/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactNumber" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact Number</Label>
                    <Input id="contactNumber" name="contactNumber" value={clientData.contactNumber} onChange={handleClientChange} placeholder="09XX XXX XXXX" className="h-10 bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="idType" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">ID Type</Label>
                    <select
                      id="idType"
                      name="idType"
                      className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-all"
                      value={clientData.idType}
                      onChange={handleClientChange}
                    >
                      <option value="Driver's License">Driver&apos;s License</option>
                      <option value="Passport">Passport</option>
                      <option value="UMID">UMID</option>
                      <option value="National ID">National ID</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Residential Address</Label>
                  <Input id="address" name="address" value={clientData.address} onChange={handleClientChange} placeholder="Full street address, city, and province" className="h-10 bg-background/50" />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Loan Configuration */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                <Calculator className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">2. Loan Configuration</h2>
            </div>

            <Card className="shadow-sm border-border/60 bg-background/50 backdrop-blur-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="principalAmount" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Principal</Label>
                    <Input id="principalAmount" name="principalAmount" type="number" step="100" required value={loanData.principalAmount} onChange={handleLoanChange} className="h-10 font-bold text-primary bg-background/50 text-base" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="monthlyInterestRate" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interest Rate (%)</Label>
                    <Input id="monthlyInterestRate" name="monthlyInterestRate" type="number" step="0.1" required value={loanData.monthlyInterestRate} onChange={handleLoanChange} className="h-10 bg-background/50" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="months" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Duration (M)</Label>
                    <Input id="months" name="months" type="number" required value={loanData.months} onChange={handleLoanChange} className="h-10 bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="paymentFrequency" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Frequency</Label>
                    <select
                      id="paymentFrequency"
                      name="paymentFrequency"
                      className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30 transition-all"
                      value={loanData.paymentFrequency}
                      onChange={handleLoanChange}
                    >
                      <option value="MONTHLY">Monthly (1x/mo)</option>
                      <option value="SEMI_MONTHLY">Semi-Monthly (2x/mo)</option>
                      <option value="WEEKLY">Weekly (4x/mo)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="loanDate" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Release Date</Label>
                    <Input id="loanDate" name="loanDate" type="date" required value={loanData.loanDate} onChange={handleLoanChange} className="h-10 bg-background/50 text-xs" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Section: Documents */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                <FileUp className="h-3.5 w-3.5 text-primary" />
              </div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">3. Verification Documents</h2>
            </div>

            <Card className="shadow-sm border-border/60 bg-background/50 backdrop-blur-sm border-dashed">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 bg-muted/5 hover:bg-muted/10 transition-colors relative group overflow-hidden">
                  <div className="pointer-events-none flex flex-col items-center justify-center text-center">
                    <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload identification or proof of income</p>
                    <p className="text-xs text-muted-foreground mt-1">Accepts PDF, PNG, or JPG (Optional)</p>
                  </div>
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    multiple 
                    onChange={addAttachment} 
                    title="Upload documents" 
                  />
                </div>

                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                    {attachments.map((attr) => (
                      <div key={attr.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background group shadow-xs">
                        <div className="h-8 w-8 rounded bg-primary/5 flex items-center justify-center text-primary">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate uppercase tracking-tight">{attr.file.name}</p>
                          <select
                            value={attr.type}
                            onChange={(e) => updateAttachmentType(attr.id, e.target.value as AttachmentFile["type"])}
                            className="text-[10px] text-muted-foreground bg-transparent border-none p-0 h-auto focus:ring-0 cursor-pointer hover:text-primary transition-colors"
                          >
                            <option value="GOV_ID">ID Card</option>
                            <option value="PROOF_OF_INCOME">Income</option>
                            <option value="PROOF_OF_BILLING">Billing</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <Button type="button" variant="ghost" size="icon-xs" className="opacity-0 group-hover:opacity-100" onClick={() => removeAttachment(attr.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sidebar Summary - Right */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          <Card className="shadow-lg border-primary/20 bg-primary/[0.02] overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Loan Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {calculations ? (
                <>
                  <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Amortization</span>
                      <span className="text-2xl font-black text-foreground">₱{calculations.amortizationAmount}</span>
                    </div>
                    <div className="h-px bg-border/50 w-full" />
                    <div className="grid grid-cols-2 gap-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Interest Total</span>
                        <span className="text-sm font-semibold">₱{calculations.estimatedInterest}</span>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Terms</span>
                        <span className="text-sm font-semibold">{calculations.totalTerms} payments</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Monthly Rate</span>
                        <span className="text-sm font-semibold text-primary">{loanData.monthlyInterestRate}%</span>
                      </div>
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total Payable</span>
                        <span className="text-sm font-semibold">₱{calculations.totalPayable}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/80 rounded-lg p-3 border border-border/50 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-[10px] leading-relaxed text-muted-foreground">
                      This calculation assumes a <strong>{loanData.loanType.toLowerCase()}</strong> interest method.
                      A complete schedule will be generated starting from {new Date(loanData.loanDate).toLocaleDateString()}.
                    </p>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center space-y-2">
                  <Calculator className="h-8 w-8 text-muted-foreground/20 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">Enter loan details to view summary</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-0">
              <Button
                type="submit"
                className="w-full h-11 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
                disabled={isSubmitting || !calculations}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-10 text-xs text-muted-foreground hover:bg-muted/50"
                onClick={() => router.back()}
                disabled={isSubmitting}
              >
                Cancel and Return
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 animate-in fade-in zoom-in-95">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-xs font-semibold text-destructive leading-tight">{error}</p>
            </div>
          )}
        </aside>
      </form>
    </div>
  )
}
