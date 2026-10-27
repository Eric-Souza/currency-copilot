import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import { getRate } from './get-rate'
import { getRateHistory } from './get-rate-history'

export const tools = { getRate, getRateHistory }

export type ChatTools = InferUITools<typeof tools>
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>
