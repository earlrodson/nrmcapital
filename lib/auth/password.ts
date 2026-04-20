import { createHash, timingSafeEqual } from "node:crypto"

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

export function hashPassword(raw: string) {
  return digest(raw)
}

export function verifyPassword(raw: string, hashed: string) {
  const computed = digest(raw)
  if (computed.length !== hashed.length) {
    return false
  }
  return timingSafeEqual(Buffer.from(computed), Buffer.from(hashed))
}
