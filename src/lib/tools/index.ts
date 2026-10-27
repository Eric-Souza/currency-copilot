import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import { convert } from './convert'
import { getRate } from './get-rate'
import { getRateHistory } from './get-rate-history'

export const tools = { getRate, getRateHistory, convert }

export type ChatTools = InferUITools<typeof tools>
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>
