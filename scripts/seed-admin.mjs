import { createHash, randomUUID } from "node:crypto"
import { drizzle } from "drizzle-orm/postgres-js"
import { sql } from "drizzle-orm"
import postgres from "postgres"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Run with an env file or exported variable.")
}

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nrmcapital.com"
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!ChangeMe"
const adminName = process.env.SEED_ADMIN_NAME ?? "Sample Admin"
const adminRole = process.env.SEED_ADMIN_ROLE ?? "SUPERADMIN"

function hashPassword(raw) {
  return createHash("sha256").update(raw).digest("hex")
}

const client = postgres(databaseUrl, { max: 1, prepare: false })
const db = drizzle(client)

async function seedAdmin() {
  const existing = await db.execute(
    sql`select id from users where email = ${adminEmail} limit 1`
  )

  if (existing.length > 0) {
    console.log(`Admin user already exists for ${adminEmail}. No changes made.`)
    return
  }

  await db.execute(sql`
    insert into users (id, email, password_hash, name, role, is_active, created_at, updated_at)
    values (
      ${randomUUID()},
      ${adminEmail},
      ${hashPassword(adminPassword)},
      ${adminName},
      ${adminRole},
      ${true},
      now(),
      now()
    )
  `)

  console.log("Seeded sample admin account:")
  console.log(`- email: ${adminEmail}`)
  console.log(`- password: ${adminPassword}`)
  console.log(`- role: ${adminRole}`)
}

try {
  await seedAdmin()
} finally {
  await client.end()
}
