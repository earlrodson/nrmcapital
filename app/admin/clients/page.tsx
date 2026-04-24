import { Suspense } from "react"
import { ClientListClient } from "./client-list-client"

export default function AdminClientsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <Suspense fallback={<div className="py-8 text-sm text-muted-foreground">Loading clients...</div>}>
        <ClientListClient />
      </Suspense>
    </div>
  )
}
