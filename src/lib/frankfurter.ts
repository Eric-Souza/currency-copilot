// Frankfurter: free European Central Bank reference rates, no API key. Rates update once per
// working day, around 16:00 CET, so "latest" on a weekend is Friday's rate.

const BASE_URL = 'https://api.frankfurter.dev/v1'
// Its usual response time is under a second; a hung request shouldn't stall the whole chat
const TIMEOUT_MS = 8000

export interface Rate {
  base: string
  quote: string
  rate: number
  /** The ECB publication date of the rate, YYYY-MM-DD */
  date: string
}

export interface RateHistory {
  base: string
  quote: string
  /** One point per working day, oldest first */
  points: { date: string; rate: number }[]
  first: number
  last: number
  min: number
  max: number
  /** Change from the first to the last point, in percent */
  changePct: number
}

export interface Conversion {
  amount: number
  base: string
  /** The ECB publication date of the rates, YYYY-MM-DD */
  date: string
  rows: { quote: string; rate: number; value: number }[]
  /** Requested currencies Frankfurter doesn't cover */
  unavailable: string[]
}

export class FrankfurterError extends Error {}

async function request<T>(path: string, pair: string, fetchFn: typeof fetch): Promise<T> {
  const response = await fetchFn(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((error) => {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new FrankfurterError(`Frankfurter didn't respond within ${TIMEOUT_MS / 1000} seconds. Try again.`)
    }
    throw error
  })
  if (response.status === 404) {
    throw new FrankfurterError(
      `${pair} isn't available. Frankfurter covers about 30 major currencies (ECB reference rates).`,
    )
  }
  if (!response.ok) throw new FrankfurterError(`Frankfurter returned ${response.status} ${response.statusText}`)
  return response.json() as Promise<T>
}

export async function getLatestRate(base: string, quote: string, fetchFn: typeof fetch = fetch): Promise<Rate> {
  base = base.toUpperCase()
  quote = quote.toUpperCase()
  const data = await request<{ date: string; rates: Record<string, number> }>(`/latest?base=${base}&symbols=${quote}`, `${base}/${quote}`, fetchFn)
  // Frankfurter leaves the base out of the rates, so USD/USD comes back empty
  const rate = base === quote ? 1 : data.rates[quote]
  if (rate === undefined) throw new FrankfurterError(`Frankfurter returned no ${base}/${quote} rate`)
  return { base, quote, rate, date: data.date }
}

/** Daily rates for the last `days` calendar days (Frankfurter snaps the start to a working day). */
export async function getRateHistory(
  base: string,
  quote: string,
  days: number,
  fetchFn: typeof fetch = fetch,
  today: Date = new Date(),
): Promise<RateHistory> {
  base = base.toUpperCase()
  quote = quote.toUpperCase()
  if (base === quote) throw new FrankfurterError(`${base}/${quote} is always 1, so there's no history to show.`)
  const start = new Date(today.getTime() - days * 86_400_000).toISOString().slice(0, 10)
  const data = await request<{ rates: Record<string, Record<string, number>> }>(`/${start}..?base=${base}&symbols=${quote}`, `${base}/${quote}`, fetchFn)
  const points = Object.entries(data.rates)
    .map(([date, rates]) => ({ date, rate: rates[quote] }))
    .filter((p) => p.rate !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (points.length === 0) throw new FrankfurterError(`Frankfurter returned no ${base}/${quote} rates since ${start}`)
  const rates = points.map((p) => p.rate)
  const first = rates[0]
  const last = rates[rates.length - 1]
  return {
    base,
    quote,
    points,
    first,
    last,
    min: Math.min(...rates),
    max: Math.max(...rates),
    changePct: Math.round(((last - first) / first) * 10_000) / 100,
  }
}

/** `amount` of `base` in each of `quotes`, at the latest rates. */
export async function convert(
  amount: number,
  base: string,
  quotes: string[],
  fetchFn: typeof fetch = fetch,
): Promise<Conversion> {
  base = base.toUpperCase()
  quotes = [...new Set(quotes.map((q) => q.toUpperCase()))]
  const others = quotes.filter((q) => q !== base)
  let date: string
  let rates: Record<string, number> = {}
  if (others.length > 0) {
    // One request for every currency. Frankfurter drops symbols it doesn't know, and 404s only
    // when none are left or the base is unknown
    const data = await request<{ date: string; rates: Record<string, number> }>(
      `/latest?base=${base}&symbols=${others.join(',')}`,
      `${base}/${others.join(', ')}`,
      fetchFn,
    )
    date = data.date
    rates = data.rates
  } else {
    date = (await request<{ date: string }>(`/latest?base=${base}`, base, fetchFn)).date
  }
  rates[base] = 1
  const rows = quotes
    .filter((quote) => rates[quote] !== undefined)
    .map((quote) => ({ quote, rate: rates[quote], value: amount * rates[quote] }))
  return { amount, base, date, rows, unavailable: quotes.filter((quote) => rates[quote] === undefined) }
}
