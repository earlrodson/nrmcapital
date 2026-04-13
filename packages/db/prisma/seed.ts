import { PrismaClient, Role } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const email = "admin@nrm.local"
  const passwordHash = await hash("admin123", 12)

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password_hash: passwordHash,
      name: "Default Admin",
      role: Role.SUPERADMIN,
    },
  })
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
