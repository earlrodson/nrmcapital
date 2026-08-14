import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "./password"

describe("hashPassword", () => {
  it("produces a deterministic sha256 hex digest", () => {
    const hashed = hashPassword("correct-horse-battery-staple")
    expect(hashed).toBe(hashPassword("correct-horse-battery-staple"))
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
  })

  it("produces different digests for different inputs", () => {
    expect(hashPassword("password-a")).not.toBe(hashPassword("password-b"))
  })
})

describe("verifyPassword", () => {
  it("accepts the correct raw password against its hash", () => {
    const hashed = hashPassword("s3cret!")
    expect(verifyPassword("s3cret!", hashed)).toBe(true)
  })

  it("rejects an incorrect raw password", () => {
    const hashed = hashPassword("s3cret!")
    expect(verifyPassword("wrong-password", hashed)).toBe(false)
  })

  it("rejects a hash of different length without throwing", () => {
    expect(verifyPassword("s3cret!", "not-a-real-hash")).toBe(false)
  })

  it("rejects an empty raw password", () => {
    const hashed = hashPassword("s3cret!")
    expect(verifyPassword("", hashed)).toBe(false)
  })
})
