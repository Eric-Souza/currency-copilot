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

export class FrankfurterError extends Error {}

export async function getLatestRate(base: string, quote: string, fetchFn: typeof fetch = fetch): Promise<Rate> {
  base = base.toUpperCase()
  quote = quote.toUpperCase()
  const response = await fetchFn(`${BASE_URL}/latest?base=${base}&symbols=${quote}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error) => {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new FrankfurterError(`Frankfurter didn't respond within ${TIMEOUT_MS / 1000} seconds. Try again.`)
    }
    throw error
  })
  if (response.status === 404) {
    throw new FrankfurterError(
      `${base}/${quote} isn't available. Frankfurter covers about 30 major currencies (ECB reference rates).`,
    )
  }
  if (!response.ok) throw new FrankfurterError(`Frankfurter returned ${response.status} ${response.statusText}`)
  const data = (await response.json()) as { date: string; rates: Record<string, number> }
  // Frankfurter leaves the base out of the rates, so USD/USD comes back empty
  const rate = base === quote ? 1 : data.rates[quote]
  if (rate === undefined) throw new FrankfurterError(`Frankfurter returned no ${base}/${quote} rate`)
  return { base, quote, rate, date: data.date }
}
