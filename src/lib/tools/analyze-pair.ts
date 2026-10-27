import { generateText, Output, tool } from 'ai'
import { z } from 'zod'
import { analyzeHistory } from '../analysis'
import { getRateHistory } from '../frankfurter'
import { getModel } from '../model'
import { currencyCode } from './get-rate'

export const SummarySchema = z.object({
  headline: z.string().describe('One sentence, under 90 characters, answering "is today a good day to exchange?"'),
  reasons: z.array(z.string()).min(2).max(3).describe('Short reasons, each citing one of the numbers'),
})

const SUMMARY_SYSTEM = `You explain exchange-rate statistics to someone about to exchange the base currency into the quote currency.
A higher rate gets them more of the quote currency. Use only the numbers given; never invent rates or forecasts.
Percentile 80 means today's rate beats 80% of the last 30 days. Match the given stance; don't override it.
Plain language, no financial-advice disclaimers (the UI adds one).`

export const analyzePair = tool({
  description:
    'Whether today is a good day to exchange one currency into another: today\'s rate against the last ' +
    '30 and 90 days (percentile, average, trend), with a short written summary. Use it for "should I ' +
    'exchange now", "is it a good time to buy X". The UI shows the result as a card, so reply with one ' +
    'short sentence and never promise where the rate will go.',
  inputSchema: z.object({
    base: currencyCode.describe('The currency the user has, ISO 4217'),
    quote: currencyCode.describe('The currency the user wants, ISO 4217'),
  }),
  execute: async ({ base, quote }, { abortSignal }) => {
    const analysis = analyzeHistory(await getRateHistory(base, quote, 90))
    try {
      const { output } = await generateText({
        model: getModel(),
        output: Output.object({ schema: SummarySchema }),
        system: SUMMARY_SYSTEM,
        prompt: JSON.stringify(analysis),
        abortSignal,
        // The chat's own answer still has to fit in the route's time limit after this
        timeout: { totalMs: 10_000 },
        maxRetries: 1,
      })
      return { ...analysis, summary: output }
    } catch (error) {
      // The numbers are still worth showing without the write-up
      console.error('analyzePair summary failed', error)
      return { ...analysis, summary: null }
    }
  },
})
