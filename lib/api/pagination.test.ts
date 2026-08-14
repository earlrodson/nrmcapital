import { describe, expect, it } from "vitest"

import { parsePagination } from "./pagination"

describe("parsePagination", () => {
  it("defaults to page 1 and pageSize 20 with offset 0", () => {
    const result = parsePagination(new URLSearchParams())
    expect(result).toEqual({ page: 1, pageSize: 20, offset: 0 })
  })

  it("computes offset from page and pageSize", () => {
    const result = parsePagination(new URLSearchParams({ page: "3", pageSize: "10" }))
    expect(result).toEqual({ page: 3, pageSize: 10, offset: 20 })
  })

  it("rejects a pageSize above the max of 100", () => {
    expect(() => parsePagination(new URLSearchParams({ pageSize: "101" }))).toThrow()
  })

  it("rejects non-positive page numbers", () => {
    expect(() => parsePagination(new URLSearchParams({ page: "0" }))).toThrow()
    expect(() => parsePagination(new URLSearchParams({ page: "-1" }))).toThrow()
  })

  it("rejects non-integer values", () => {
    expect(() => parsePagination(new URLSearchParams({ page: "1.5" }))).toThrow()
  })
})
