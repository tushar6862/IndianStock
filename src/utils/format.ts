export function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatSigned(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const formatted = formatNumber(Math.abs(value), digits)
  if (value > 0) return `+${formatted}`
  if (value < 0) return `-${formatted}`
  return formatNumber(0, digits)
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${formatSigned(value, digits)}%`
}

export function formatIst(unixSeconds: number | null | undefined): string {
  if (unixSeconds == null || !Number.isFinite(unixSeconds)) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(unixSeconds * 1000))
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

export function lastNumber(values: Array<number | null> | undefined): number | null {
  if (!values) return null
  for (let i = values.length - 1; i >= 0; i -= 1) {
    const value = values[i]
    if (value != null && Number.isFinite(value)) return value
  }
  return null
}
