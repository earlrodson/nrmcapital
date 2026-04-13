import { prisma } from "@/lib/db"

export async function getClients() {
  return prisma.client.findMany({
    orderBy: { created_at: "desc" },
    take: 20,
  })
}
