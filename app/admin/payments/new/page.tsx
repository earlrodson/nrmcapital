import { Suspense } from "react"
import { NewPaymentClient } from "./new-payment-client"

export default function AdminNewPaymentPage() {
  return (
    <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading payment form...</div>}>
      <NewPaymentClient />
    </Suspense>
  )
}
