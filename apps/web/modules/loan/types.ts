export interface LoanFilters {
  status?: "ACTIVE" | "COMPLETED" | "DEFAULTED"
  clientId?: string
  page?: number
  limit?: number
}
