import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../../../.env") });

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Set it in the workspace .env file.",
    );
  }

  const email = "earlrodson@gmail.com";
  const first_name = "Earl";
  const last_name = "Carino";

  const password = "admin123";
  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      password_hash: passwordHash,
      first_name,
      last_name,
      role: Role.SUPERADMIN,
      is_active: true,
      must_change_password: true,
    },
    create: {
      email,
      password_hash: passwordHash,
      first_name,
      last_name,
      role: Role.SUPERADMIN,
      is_active: true,
      must_change_password: true,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
