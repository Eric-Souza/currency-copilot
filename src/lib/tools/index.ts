import type { InferUITools, UIDataTypes, UIMessage } from 'ai'
import { getRate } from './get-rate'

export const tools = { getRate }

export type ChatTools = InferUITools<typeof tools>
export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>
