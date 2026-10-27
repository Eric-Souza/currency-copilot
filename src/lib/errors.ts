import { APICallError, LoadAPIKeyError, RetryError } from 'ai'
import { FrankfurterError } from './frankfurter'

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
    return "The model's free-tier rate limit was hit. Wait a minute and try again."
  }
  if (APICallError.isInstance(error) && error.statusCode === 503) {
    return 'The model is overloaded right now. Try again in a moment, or switch AI_PROVIDER or AI_MODEL.'
  }
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The model took too long to answer. Try again, or switch AI_PROVIDER or AI_MODEL.'
  }
  console.error('[chat]', error)
  return 'Something went wrong. Try again.'
}
