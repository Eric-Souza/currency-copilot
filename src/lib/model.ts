// Which model answers: Gemini by default, or Groq. Both have free tiers.
//   AI_PROVIDER=google  needs GOOGLE_GENERATIVE_AI_API_KEY
//   AI_PROVIDER=groq    needs GROQ_API_KEY
// AI_MODEL overrides the provider's default model.

import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'
import type { LanguageModel } from 'ai'

export const DEFAULT_MODELS = {
  google: 'gemini-3.6-flash',
  groq: 'openai/gpt-oss-120b',
} as const

export type Provider = keyof typeof DEFAULT_MODELS

export function modelConfig(env: Record<string, string | undefined> = process.env) {
  const provider = (env.AI_PROVIDER || 'google').toLowerCase()
  if (!(provider in DEFAULT_MODELS)) {
    throw new Error(`AI_PROVIDER must be one of ${Object.keys(DEFAULT_MODELS).join(', ')}, got "${provider}"`)
  }
  const p = provider as Provider
  return { provider: p, modelId: env.AI_MODEL || DEFAULT_MODELS[p] }
}

export function getModel(env: Record<string, string | undefined> = process.env): LanguageModel {
  const { provider, modelId } = modelConfig(env)
  return provider === 'groq' ? groq(modelId) : google(modelId)
}
