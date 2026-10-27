import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  TypeValidationError,
  validateUIMessages,
} from 'ai'
import { getChatStore } from '@/lib/db'
import { CHAT_ID } from '@/lib/db/chat-store'
import { chatErrorMessage, reportTimeouts } from '@/lib/errors'
import { getModel } from '@/lib/model'
import { ownerId } from '@/lib/owner'
import { type ChatMessage, tools } from '@/lib/tools'

export const maxDuration = 60

const SYSTEM = `You answer questions about currency exchange rates.
Use the tools for every rate. Never state a rate from memory.
Tool results are shown to the user as cards and charts, so don't repeat their numbers in a list or table:
add a sentence or two of context instead, such as when the rate was published or how a trend moved.
For trends or "how has X moved", use getRateHistory; "this month" means 30 days, "this year" 365.
For amounts ("how much is 500 dollars in reais"), use convert, with every target currency in one call.
For "should I exchange now" or "is it a good time", use analyzePair. Never predict where a rate will go.
Rates are European Central Bank reference rates, updated once per working day, not live market quotes.`

export async function POST(req: Request) {
  const body: { id?: unknown; messages?: unknown } = await req.json()
  if (typeof body.id !== 'string' || !CHAT_ID.test(body.id)) return new Response('Invalid chat id', { status: 400 })
  const chatId = body.id

  // The client sends the whole conversation; check it against the tools before trusting it
  let messages: ChatMessage[]
  try {
    messages = await validateUIMessages<ChatMessage>({ messages: body.messages, tools })
  } catch (error) {
    if (TypeValidationError.isInstance(error)) return new Response('Invalid messages', { status: 400 })
    throw error
  }

  const owner = await ownerId()
  const store = getChatStore()
  if (store && (await store.load(chatId, owner)) === null) return new Response('Chat not found', { status: 404 })

  const result = streamText({
    model: getModel(),
    system: SYSTEM,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    // Fail inside maxDuration, and fast when a busy model stops sending, instead of hanging
    timeout: { totalMs: 55_000, chunkMs: 15_000 },
  })
  // Finish the answer even if the browser goes away, so the saved chat isn't cut off
  result.consumeStream()

  const stream = result.toUIMessageStream({
    originalMessages: messages,
    // Server-side ids, so a saved answer keeps the id the browser saw
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onError: chatErrorMessage,
    onFinish: async ({ messages }) => {
      try {
        await store?.save(chatId, owner, messages)
      } catch (error) {
        // The answer already reached the browser; a failed save shouldn't turn it into an error
        console.error('[chat] saving failed', error)
      }
    },
  })
  return createUIMessageStreamResponse({ stream: reportTimeouts(stream, req.signal) })
}
