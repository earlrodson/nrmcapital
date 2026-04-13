export function normalizeSearch(search?: string): string {
  return (search ?? "").trim()
}
