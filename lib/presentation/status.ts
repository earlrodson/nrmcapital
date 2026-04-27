export type RepaymentStatus = "UPCOMING" | "DUE" | "PARTIAL" | "OVERDUE" | "PAID"

export function getRepaymentStatusBadge(status: RepaymentStatus): {
  variant: "default" | "destructive" | "outline"
  className: string
} {
  if (status === "PAID") {
    return { variant: "default", className: "bg-green-600 text-[10px]" }
  }
  if (status === "OVERDUE") {
    return { variant: "destructive", className: "text-[10px]" }
  }
  if (status === "PARTIAL") {
    return { variant: "outline", className: "border-amber-500 text-amber-600 text-[10px]" }
  }
  if (status === "DUE") {
    return { variant: "outline", className: "border-blue-500 text-blue-600 text-[10px]" }
  }
  return { variant: "outline", className: "text-[10px]" }
}
