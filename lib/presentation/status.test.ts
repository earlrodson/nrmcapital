import { describe, expect, it } from "vitest"

import { getRepaymentStatusBadge } from "./status"

describe("getRepaymentStatusBadge", () => {
  it("returns the green default badge for PAID", () => {
    expect(getRepaymentStatusBadge("PAID")).toEqual({
      variant: "default",
      className: "bg-green-600 text-[10px]",
    })
  })

  it("returns the destructive badge for OVERDUE", () => {
    expect(getRepaymentStatusBadge("OVERDUE")).toEqual({
      variant: "destructive",
      className: "text-[10px]",
    })
  })

  it("returns the amber outline badge for PARTIAL", () => {
    expect(getRepaymentStatusBadge("PARTIAL")).toEqual({
      variant: "outline",
      className: "border-amber-500 text-amber-600 text-[10px]",
    })
  })

  it("returns the blue outline badge for DUE", () => {
    expect(getRepaymentStatusBadge("DUE")).toEqual({
      variant: "outline",
      className: "border-blue-500 text-blue-600 text-[10px]",
    })
  })

  it("falls back to a plain outline badge for UPCOMING", () => {
    expect(getRepaymentStatusBadge("UPCOMING")).toEqual({
      variant: "outline",
      className: "text-[10px]",
    })
  })
})
