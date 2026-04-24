import { Suspense } from "react"
import { LoanListClient } from "./loan-list-client"

export default function AdminLoansPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading loans...</div>}>
        <LoanListClient />
      </Suspense>
    </div>
  )
}
