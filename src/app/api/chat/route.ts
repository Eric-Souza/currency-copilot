import { convertToModelMessages, stepCountIs, streamText } from 'ai'
import { chatErrorMessage } from '@/lib/errors'
import { getModel } from '@/lib/model'
import { type ChatMessage, tools } from '@/lib/tools'

export const maxDuration = 30

const SYSTEM = `You answer questions about currency exchange rates.
Use the tools for every rate. Never state a rate from memory.
Tool results are shown to the user as cards and charts, so don't repeat their numbers in a list or table:
add a sentence or two of context instead, such as when the rate was published or how a trend moved.
For trends or "how has X moved", use getRateHistory; "this month" means 30 days, "this year" 365.
For amounts ("how much is 500 dollars in reais"), use convert, with every target currency in one call.
Rates are European Central Bank reference rates, updated once per working day, not live market quotes.`

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json()
  const result = streamText({
    model: getModel(),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    // Fail inside maxDuration, and fast when a busy model stops sending, instead of hanging
    timeout: { totalMs: 28_000, chunkMs: 15_000 },
    abortSignal: req.signal,
  })
  return result.toUIMessageStreamResponse({ onError: chatErrorMessage })
}
