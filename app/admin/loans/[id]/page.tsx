import { LoanDetailClient } from "./loan-detail-client"

interface AdminLoanDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminLoanDetailPage({ params }: AdminLoanDetailPageProps) {
  const { id } = await params
  return <LoanDetailClient loanId={id} />
}
