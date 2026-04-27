import { Suspense } from "react"

import { LoanApplicationsClient } from "./loan-applications-client"

export default function AdminApplicationsPage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading applications...</div>}>
      <LoanApplicationsClient />
    </Suspense>
  )
}
