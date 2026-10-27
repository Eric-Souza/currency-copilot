import { tool } from 'ai'
import { z } from 'zod'
import { getLatestRate } from '../frankfurter'

export const currencyCode = z
  .string()
  .regex(/^[A-Za-z]{3}$/)
  .transform((code) => code.toUpperCase())
  .describe('ISO 4217 code, e.g. USD, BRL, EUR')

export const getRate = tool({
  description:
    'The latest exchange rate between two currencies (ECB reference rate, updated each working day). ' +
    'The UI shows the result as a rate card, so reply with one short sentence, not a repeat of the numbers.',
  inputSchema: z.object({ base: currencyCode, quote: currencyCode }),
  execute: ({ base, quote }) => getLatestRate(base, quote),
})
