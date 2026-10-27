import { tool } from 'ai'
import { z } from 'zod'
import { getRateHistory as fetchHistory } from '../frankfurter'
import { currencyCode } from './get-rate'

export const getRateHistory = tool({
  description:
    'Daily exchange rates between two currencies over the last N days (ECB reference rates, working ' +
    'days only), with the first, last, min, and max rate and the percent change. Use it for trends, ' +
    '"how has X moved", or comparing today with the recent past. The UI shows the result as a chart, ' +
    "so reply with one or two sentences on the trend instead of listing the rates.",
  inputSchema: z.object({
    base: currencyCode,
    quote: currencyCode,
    days: z.number().int().min(7).max(365).default(30).describe('Calendar days to look back, 7 to 365'),
  }),
  execute: ({ base, quote, days }) => fetchHistory(base, quote, days),
})
