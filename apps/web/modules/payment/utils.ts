export function parseAmount(value: string): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero.")
  }
  return amount
}
