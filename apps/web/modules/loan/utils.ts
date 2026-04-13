export function normalizePage(page?: string): number {
  const parsed = Number(page)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}
