import { APICallError, LoadAPIKeyError } from 'ai'
import { FrankfurterError } from './frankfurter'

/**
 * What the chat shows when a stream or a tool fails: errors written for the user (setup, rate
 * limits, unsupported currencies) as they are, anything else generic.
 */
export function chatErrorMessage(error: unknown): string {
  if (error instanceof FrankfurterError) return error.message
  if (LoadAPIKeyError.isInstance(error)) return `${error.message} See .env.example.`
  if (APICallError.isInstance(error) && error.statusCode === 429) {
    return "The model's free-tier rate limit was hit. Wait a minute and try again."
  }
  console.error('[chat]', error)
  return 'Something went wrong. Try again.'
}
