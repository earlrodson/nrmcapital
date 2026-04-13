import { prisma } from "@/lib/db"

export async function getLoans() {
  return prisma.loan.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
  })
}
