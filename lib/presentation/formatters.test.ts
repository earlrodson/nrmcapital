import { describe, expect, it } from "vitest"

import {
  formatAmount,
  formatAmountRounded,
  formatCurrencyPHP,
  formatCurrencyPHPRounded,
  formatDate,
  formatDateTime,
} from "./formatters"

describe("currency and amount formatters", () => {
  it("rounds currency display to 2 decimals", () => {
    expect(formatCurrencyPHP(1234.555)).toBe("₱1,234.56")
    expect(formatCurrencyPHP("0")).toBe("₱0.00")
    expect(formatCurrencyPHP("999.994")).toBe("₱999.99")
  })

  it("supports whole-number rounded currency display", () => {
    expect(formatCurrencyPHPRounded(1234.555)).toBe("₱1,235")
    expect(formatCurrencyPHPRounded("1499.49")).toBe("₱1,499")
  })

  it("rounds numeric amount strings consistently", () => {
    expect(formatAmount("1234.555")).toBe("1,234.56")
    expect(formatAmountRounded("1234.555")).toBe("1,235")
  })

  it("treats null, undefined, and non-numeric input as zero", () => {
    expect(formatAmount(null)).toBe("0.00")
    expect(formatAmount(undefined)).toBe("0.00")
    expect(formatCurrencyPHP("not-a-number")).toBe("₱0.00")
  })
})

describe("date formatters", () => {
  it("returns a dash for missing or invalid dates", () => {
    expect(formatDate(null)).toBe("-")
    expect(formatDate(undefined)).toBe("-")
    expect(formatDate("not-a-date")).toBe("-")
    expect(formatDateTime(null)).toBe("-")
  })

  it("formats valid dates", () => {
    expect(formatDate("2026-01-15")).not.toBe("-")
    expect(formatDateTime("2026-01-15T10:30:00Z")).not.toBe("-")
  })
})
