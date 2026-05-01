import { test, expect } from "@playwright/test"

import {
  formatAmount,
  formatAmountRounded,
  formatCurrencyPHP,
  formatCurrencyPHPRounded,
} from "../lib/presentation/formatters"

test.describe("Presentation formatters", () => {
  test("rounds currency display to 2 decimals", () => {
    expect(formatCurrencyPHP(1234.555)).toBe("₱1,234.56")
    expect(formatCurrencyPHP("0")).toBe("₱0.00")
    expect(formatCurrencyPHP("999.994")).toBe("₱999.99")
  })

  test("supports whole-number rounded currency display", () => {
    expect(formatCurrencyPHPRounded(1234.555)).toBe("₱1,235")
    expect(formatCurrencyPHPRounded("1499.49")).toBe("₱1,499")
  })

  test("rounds numeric amount strings consistently", () => {
    expect(formatAmount("1234.555")).toBe("1,234.56")
    expect(formatAmountRounded("1234.555")).toBe("1,235")
  })
})
