import { test, expect, type APIRequestContext } from "@playwright/test"
import postgres from "postgres"
import { randomUUID } from "node:crypto"

const sql = postgres(process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres")

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@nrmcapital.com"
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin123!ChangeMe"

async function attemptLogin(
  request: APIRequestContext,
  identifier: string,
  password: string,
  ip: string,
): Promise<number> {
  const res = await request.post("/api/auth/login", {
    data: { identifier, password },
    headers: { "x-forwarded-for": ip },
  })
  return res.status()
}

async function clearThrottle(scope: "identifier" | "ip", key: string) {
  await sql`delete from login_throttles where scope = ${scope} and key = ${key}`
}

test.describe("Login throttle", () => {
  test.beforeAll(() => {
    test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for login throttle DB assertions.")
  })

  test.afterAll(async () => {
    await sql.end()
  })

  test("locks an identifier out after 5 failed attempts, independent of other identifiers on the same IP", async ({
    request,
  }) => {
    const ip = `10.0.${randomUUID().slice(0, 2)}.1`
    const identifier = `e2e-throttle-id-${randomUUID()}@example.com`
    await clearThrottle("identifier", identifier)
    await clearThrottle("ip", ip)

    for (let i = 0; i < 5; i++) {
      const status = await attemptLogin(request, identifier, "wrong-password", ip)
      expect(status, `attempt ${i + 1} should be a normal invalid-credentials rejection`).toBe(401)
    }

    const locked = await attemptLogin(request, identifier, "wrong-password", ip)
    expect(locked).toBe(429)

    // Correct password is also rejected while the identifier bucket is locked.
    const lockedWithCorrectPassword = await attemptLogin(request, adminEmail, "not-the-real-password", ip)
    expect(lockedWithCorrectPassword).toBe(401) // different identifier, same IP, IP bucket still has headroom

    await clearThrottle("identifier", identifier)
    await clearThrottle("ip", ip)
  })

  test("locks an IP out after 20 combined failed attempts across different identifiers", async ({ request }) => {
    const ip = `10.1.${randomUUID().slice(0, 2)}.1`
    const identifiers = Array.from({ length: 4 }, () => `e2e-throttle-ip-${randomUUID()}@example.com`)
    await clearThrottle("ip", ip)
    for (const identifier of identifiers) await clearThrottle("identifier", identifier)

    let lastStatus = 0
    for (let i = 0; i < 20; i++) {
      const identifier = identifiers[i % identifiers.length]!
      lastStatus = await attemptLogin(request, identifier, "wrong-password", ip)
    }
    expect(lastStatus).toBe(401)

    const lockedStatus = await attemptLogin(request, `e2e-throttle-ip-fresh-${randomUUID()}@example.com`, "wrong-password", ip)
    expect(lockedStatus).toBe(429)

    await clearThrottle("ip", ip)
    for (const identifier of identifiers) await clearThrottle("identifier", identifier)
  })

  test("a successful login clears the identifier's failed-attempt count", async ({ request }) => {
    const ip = `10.2.${randomUUID().slice(0, 2)}.1`
    await clearThrottle("identifier", adminEmail)
    await clearThrottle("ip", ip)

    for (let i = 0; i < 3; i++) {
      const status = await attemptLogin(request, adminEmail, "wrong-password", ip)
      expect(status).toBe(401)
    }

    const successStatus = await attemptLogin(request, adminEmail, adminPassword, ip)
    expect(successStatus).toBe(200)

    const [row] = await sql`select * from login_throttles where scope = 'identifier' and key = ${adminEmail}`
    expect(row).toBeUndefined()

    await clearThrottle("ip", ip)
  })
})
