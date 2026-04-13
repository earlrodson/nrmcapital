import { prisma } from "@/lib/db"

export async function getPayments(loanId: string) {
  return prisma.payment.findMany({
    where: { loan_id: loanId },
    orderBy: { payment_date: "desc" },
  })
}
