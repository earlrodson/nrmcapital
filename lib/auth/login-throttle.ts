import { loginThrottleRepository, type LoginThrottleState } from "@/lib/db/repositories/login-throttle.repository"

export const LOGIN_THROTTLE_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
  lockMs: 15 * 60 * 1000,
} as const

/**
 * Pure decision + transition functions, kept separate from DB I/O so the
 * throttle boundary (Nth attempt allowed, N+1th blocked, window reset) is
 * unit-testable without a live Postgres instance.
 */
export function isThrottleStateLocked(state: LoginThrottleState | null, now: Date): boolean {
  if (!state?.lockedUntil) return false
  return state.lockedUntil.getTime() > now.getTime()
}

export function nextThrottleStateAfterFailure(state: LoginThrottleState | null, now: Date): LoginThrottleState {
  const windowExpired = state ? now.getTime() - state.windowStart.getTime() > LOGIN_THROTTLE_CONFIG.windowMs : true
  const lockExpired = !state?.lockedUntil || state.lockedUntil.getTime() <= now.getTime()

  const base: LoginThrottleState =
    !state || (windowExpired && lockExpired) ? { failCount: 0, windowStart: now, lockedUntil: null } : state

  const failCount = base.failCount + 1
  const lockedUntil =
    failCount >= LOGIN_THROTTLE_CONFIG.maxAttempts ? new Date(now.getTime() + LOGIN_THROTTLE_CONFIG.lockMs) : base.lockedUntil

  return { failCount, windowStart: base.windowStart, lockedUntil }
}

export async function isLoginThrottled(identifier: string, ip: string, now = new Date()): Promise<boolean> {
  const [identifierState, ipState] = await Promise.all([
    loginThrottleRepository.find("identifier", identifier),
    loginThrottleRepository.find("ip", ip),
  ])
  return isThrottleStateLocked(identifierState, now) || isThrottleStateLocked(ipState, now)
}

export async function recordFailedLoginAttempt(identifier: string, ip: string, now = new Date()): Promise<void> {
  const [identifierState, ipState] = await Promise.all([
    loginThrottleRepository.find("identifier", identifier),
    loginThrottleRepository.find("ip", ip),
  ])
  await Promise.all([
    loginThrottleRepository.upsert("identifier", identifier, nextThrottleStateAfterFailure(identifierState, now)),
    loginThrottleRepository.upsert("ip", ip, nextThrottleStateAfterFailure(ipState, now)),
  ])
}

export async function clearLoginThrottle(identifier: string): Promise<void> {
  await loginThrottleRepository.clear("identifier", identifier)
}
