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

/** An amount with its currency's usual decimals ("5,588.40" for BRL, "157,450" for JPY), no symbol */
export function formatAmount(value: number, currency: string) {
  const { maximumFractionDigits } = new Intl.NumberFormat('en-US', { style: 'currency', currency }).resolvedOptions()
  return value.toLocaleString('en-US', { minimumFractionDigits: maximumFractionDigits, maximumFractionDigits })
}
