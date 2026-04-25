"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type TransactionType = "DEPOSIT" | "WITHDRAWAL"

interface FundingTransactionFormProps {
  transactionType: TransactionType
}

export function FundingTransactionFormClient({ transactionType }: FundingTransactionFormProps) {
  const router = useRouter()
  const [amount, setAmount] = React.useState("")
  const [referenceNumber, setReferenceNumber] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const isDeposit = transactionType === "DEPOSIT"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/funding/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType,
          amount: amount.trim(),
          referenceNumber: referenceNumber.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const result = await response.json()
      if (!result.success) {
        setError(result.error?.message || `Failed to ${isDeposit ? "add" : "withdraw"} funding.`)
        return
      }
      router.push("/admin/funding")
    } catch {
      setError(`An error occurred while trying to ${isDeposit ? "add" : "withdraw"} funding.`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{isDeposit ? "Add Funding" : "Withdraw Funding"}</h1>
        <p className="text-muted-foreground">
          {isDeposit ? "Record a new capital deposit transaction." : "Record a funding withdrawal transaction."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="e.g. 50000.00"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="referenceNumber">Reference Number (optional)</Label>
              <Input
                id="referenceNumber"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
                placeholder="Transaction reference"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Additional details"
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting || !amount.trim()}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isDeposit ? "Add Funding" : "Withdraw Funding"}
              </Button>
              <Link href="/admin/funding">
                <Button type="button" variant="outline" disabled={submitting}>
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
