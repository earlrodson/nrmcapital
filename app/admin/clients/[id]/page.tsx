import { ClientDetailClient } from "./client-detail-client"

export default async function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <div className="mx-auto max-w-6xl">
      <ClientDetailClient clientId={id} />
    </div>
  )
}
