import { loginThrottleRepository, type LoginThrottleState } from "@/lib/db/repositories/login-throttle.repository"

// Per-identifier limit stays tight since it only ever tracks one account's failures.
// Per-IP limit is deliberately looser: an IP can be a shared office/NAT egress or a dev
// machine exercising several accounts, so it must absorb more noise before it locks out
// everyone behind that address, including a legitimate admin who typed the right password.
export const LOGIN_THROTTLE_CONFIG = {
  identifier: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    lockMs: 15 * 60 * 1000,
  },
  ip: {
    maxAttempts: 20,
    windowMs: 15 * 60 * 1000,
    lockMs: 5 * 60 * 1000,
  },
} as const

type ThrottleScopeConfig = (typeof LOGIN_THROTTLE_CONFIG)[keyof typeof LOGIN_THROTTLE_CONFIG]

/**
 * Pure decision + transition functions, kept separate from DB I/O so the
 * throttle boundary (Nth attempt allowed, N+1th blocked, window reset) is
 * unit-testable without a live Postgres instance.
 */
export function isThrottleStateLocked(state: LoginThrottleState | null, now: Date): boolean {
  if (!state?.lockedUntil) return false
  return state.lockedUntil.getTime() > now.getTime()
}

export function nextThrottleStateAfterFailure(
  state: LoginThrottleState | null,
  now: Date,
  config: ThrottleScopeConfig = LOGIN_THROTTLE_CONFIG.identifier,
): LoginThrottleState {
  const windowExpired = state ? now.getTime() - state.windowStart.getTime() > config.windowMs : true
  const lockExpired = !state?.lockedUntil || state.lockedUntil.getTime() <= now.getTime()

  const base: LoginThrottleState =
    !state || (windowExpired && lockExpired) ? { failCount: 0, windowStart: now, lockedUntil: null } : state

  const failCount = base.failCount + 1
  const lockedUntil = failCount >= config.maxAttempts ? new Date(now.getTime() + config.lockMs) : base.lockedUntil

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
    loginThrottleRepository.upsert(
      "identifier",
      identifier,
      nextThrottleStateAfterFailure(identifierState, now, LOGIN_THROTTLE_CONFIG.identifier),
    ),
    loginThrottleRepository.upsert("ip", ip, nextThrottleStateAfterFailure(ipState, now, LOGIN_THROTTLE_CONFIG.ip)),
  ])
}

// Clears both scopes: a successful login proves the account and the requesting IP are
// both legitimate, so neither bucket should keep counting stale failures against them.
export async function clearLoginThrottle(identifier: string, ip: string): Promise<void> {
  await Promise.all([loginThrottleRepository.clear("identifier", identifier), loginThrottleRepository.clear("ip", ip)])
}
