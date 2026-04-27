type DateLike = string | number | Date | null | undefined
type NumericLike = string | number | null | undefined

export function formatCurrencyPHP(value: NumericLike) {
  const amount = typeof value === "number" ? value : Number(value || 0)
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatAmount(value: NumericLike) {
  const amount = typeof value === "number" ? value : Number(value || 0)
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(value: DateLike, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString(undefined, options)
}

export function formatDateTime(value: DateLike, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString(undefined, options)
}
