import { APICallError, LoadAPIKeyError, RetryError, type UIMessageChunk } from 'ai'
import { FrankfurterError } from './frankfurter'

export const TIMEOUT_MESSAGE = 'The model took too long to answer. Try again, or switch AI_PROVIDER or AI_MODEL.'

/**
 * What the chat shows when a stream or a tool fails: errors written for the user (setup, rate
 * limits, a busy model, unsupported currencies) as they are, anything else generic.
 */
export function chatErrorMessage(error: unknown): string {
  // The SDK retries failed model calls and wraps the last failure
  if (RetryError.isInstance(error)) error = error.lastError
  if (error instanceof FrankfurterError) return error.message
  if (LoadAPIKeyError.isInstance(error)) return `${error.message} See .env.example.`
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    // Gemini's free tier also caps requests per day, per model
    if (/per ?day/i.test(`${error.message} ${error.responseBody ?? ''}`)) {
      return "The model's free daily quota is used up. Try again tomorrow, or switch AI_MODEL or AI_PROVIDER (see .env.example)."
    }
    return "The model's free-tier rate limit was hit. Wait a minute and try again."
  }
  if (APICallError.isInstance(error) && error.statusCode === 503) {
    return 'The model is overloaded right now. Try again in a moment, or switch AI_PROVIDER or AI_MODEL.'
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return TIMEOUT_MESSAGE
  }
  console.error('[chat]', error)
  return 'Something went wrong. Try again.'
}

/**
 * The chat's timeout ends the stream with an abort, which useChat treats as the user stopping it,
 * so nothing would show. Unless the browser really went away, report it as an error.
 */
export function reportTimeouts(stream: ReadableStream<UIMessageChunk>, request: AbortSignal) {
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        controller.enqueue(chunk.type === 'abort' && !request.aborted ? { type: 'error', errorText: TIMEOUT_MESSAGE } : chunk)
      },
    }),
  )
}
