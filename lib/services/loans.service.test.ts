import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db/client", () => ({ db: {} }))

import { LoansService } from "./loans.service"

function createRepositoryMock() {
  return {
    findByClientId: vi.fn(),
    findByIdWithSchedules: vi.fn(),
    createPaymentAndApplyBalance: vi.fn().mockResolvedValue({ id: "payment-1" }),
  }
}

describe("LoansService.recordPayment", () => {
  it("normalizes a numeric amount to a fixed 2-decimal string", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await service.recordPayment({ loanId: "loan-1", amount: 1500, recordedById: "user-1" })

    expect(repository.createPaymentAndApplyBalance).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "1500.00" }),
    )
  })

  it("passes through a valid decimal string amount unchanged", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await service.recordPayment({ loanId: "loan-1", amount: "999.5", recordedById: "user-1" })

    expect(repository.createPaymentAndApplyBalance).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "999.5" }),
    )
  })

  it("rejects a non-positive numeric amount", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await expect(
      service.recordPayment({ loanId: "loan-1", amount: 0, recordedById: "user-1" }),
    ).rejects.toThrow()
    expect(repository.createPaymentAndApplyBalance).not.toHaveBeenCalled()
  })

  it("rejects a string amount with more than 2 decimal places", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await expect(
      service.recordPayment({ loanId: "loan-1", amount: "100.999", recordedById: "user-1" }),
    ).rejects.toThrow()
  })

  it("rejects a negative string amount", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await expect(
      service.recordPayment({ loanId: "loan-1", amount: "-5", recordedById: "user-1" }),
    ).rejects.toThrow()
  })

  it("defaults optional fields to null and forwards ids", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await service.recordPayment({ loanId: "loan-1", amount: "100.00", recordedById: "user-1" })

    expect(repository.createPaymentAndApplyBalance).toHaveBeenCalledWith({
      loanId: "loan-1",
      amount: "100.00",
      recordedById: "user-1",
      paymentType: undefined,
      paymentMethod: undefined,
      paymentScheduleId: undefined,
      penaltyReason: null,
      notes: null,
    })
  })

  it("rejects a payload missing required fields", async () => {
    const repository = createRepositoryMock()
    const service = new LoansService(repository)

    await expect(
      // @ts-expect-error intentionally missing recordedById
      service.recordPayment({ loanId: "loan-1", amount: 100 }),
    ).rejects.toThrow()
  })
})
