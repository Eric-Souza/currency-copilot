export function formatRate(value: number) {
  // Small rates (JPY to USD, say) need more digits to mean anything
  return value.toLocaleString('en-US', { maximumSignificantDigits: value < 1 ? 4 : 6, minimumFractionDigits: 2 })
}

/** YYYY-MM-DD as "Oct 26, 2026", or "Oct 26" without the year */
export function formatDate(date: string, { year = true } = {}) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...(year && { year: 'numeric' }),
  })
}

export function formatChange(pct: number) {
  return `${pct > 0 ? '▲' : pct < 0 ? '▼' : ''} ${Math.abs(pct).toFixed(2)}%`.trim()
}
