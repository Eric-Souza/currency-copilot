import { tool } from 'ai'
import { z } from 'zod'
import { convert as convertAmount } from '../frankfurter'
import { currencyCode } from './get-rate'

export const convert = tool({
  description:
    'Convert an amount from one currency into one or more others at the latest ECB reference rates. ' +
    'The UI shows the result as a table, so reply with one short sentence, not a repeat of the amounts. ' +
    'Mention any currencies listed as unavailable.',
  inputSchema: z.object({
    amount: z.number().positive().describe('The amount of the base currency'),
    base: currencyCode,
    quotes: z.array(currencyCode).min(1).max(10).describe('The currencies to convert into'),
  }),
  execute: ({ amount, base, quotes }) => convertAmount(amount, base, quotes),
})
