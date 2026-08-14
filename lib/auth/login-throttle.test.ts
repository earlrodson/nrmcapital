import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({ db: {} }))

import {
  LOGIN_THROTTLE_CONFIG,
  isThrottleStateLocked,
  nextThrottleStateAfterFailure,
} from "@/lib/auth/login-throttle"

describe("login throttle boundary", () => {
  it("allows the Nth failure without locking", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = null as ReturnType<typeof nextThrottleStateAfterFailure> | null
    for (let i = 0; i < LOGIN_THROTTLE_CONFIG.maxAttempts - 1; i++) {
      state = nextThrottleStateAfterFailure(state, now)
    }
    expect(state!.failCount).toBe(LOGIN_THROTTLE_CONFIG.maxAttempts - 1)
    expect(isThrottleStateLocked(state, now)).toBe(false)
  })

  it("locks on the N+1th failure", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = null as ReturnType<typeof nextThrottleStateAfterFailure> | null
    for (let i = 0; i < LOGIN_THROTTLE_CONFIG.maxAttempts; i++) {
      state = nextThrottleStateAfterFailure(state, now)
    }
    expect(state!.failCount).toBe(LOGIN_THROTTLE_CONFIG.maxAttempts)
    expect(isThrottleStateLocked(state, now)).toBe(true)
  })

  it("stays locked for a request within the lock window", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = null as ReturnType<typeof nextThrottleStateAfterFailure> | null
    for (let i = 0; i < LOGIN_THROTTLE_CONFIG.maxAttempts; i++) {
      state = nextThrottleStateAfterFailure(state, now)
    }
    const later = new Date(now.getTime() + LOGIN_THROTTLE_CONFIG.lockMs - 1)
    expect(isThrottleStateLocked(state, later)).toBe(true)
  })

  it("unlocks once the lock window has fully elapsed", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = null as ReturnType<typeof nextThrottleStateAfterFailure> | null
    for (let i = 0; i < LOGIN_THROTTLE_CONFIG.maxAttempts; i++) {
      state = nextThrottleStateAfterFailure(state, now)
    }
    const after = new Date(now.getTime() + LOGIN_THROTTLE_CONFIG.lockMs + 1)
    expect(isThrottleStateLocked(state, after)).toBe(false)
  })

  it("resets the failure count once the lock window has elapsed and a new failure occurs", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = null as ReturnType<typeof nextThrottleStateAfterFailure> | null
    for (let i = 0; i < LOGIN_THROTTLE_CONFIG.maxAttempts; i++) {
      state = nextThrottleStateAfterFailure(state, now)
    }
    const after = new Date(now.getTime() + LOGIN_THROTTLE_CONFIG.lockMs + 1)
    const reset = nextThrottleStateAfterFailure(state, after)
    expect(reset.failCount).toBe(1)
    expect(isThrottleStateLocked(reset, after)).toBe(false)
  })

  it("resets the failure count once the tracking window has expired without a lock", () => {
    const now = new Date("2026-01-01T00:00:00.000Z")
    let state = nextThrottleStateAfterFailure(null, now)
    state = nextThrottleStateAfterFailure(state, now)
    expect(state.failCount).toBe(2)

    const afterWindow = new Date(now.getTime() + LOGIN_THROTTLE_CONFIG.windowMs + 1)
    const reset = nextThrottleStateAfterFailure(state, afterWindow)
    expect(reset.failCount).toBe(1)
  })
})
