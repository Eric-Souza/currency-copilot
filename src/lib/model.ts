// Which model answers: Gemini by default, or Groq. Both have free tiers.
//   AI_PROVIDER=google  needs GOOGLE_GENERATIVE_AI_API_KEY
//   AI_PROVIDER=groq    needs GROQ_API_KEY
// AI_MODEL overrides the provider's default model. AI_PROVIDER=mock is a scripted model for the
// end-to-end tests.

import { google } from '@ai-sdk/google'
import { groq } from '@ai-sdk/groq'
import type { LanguageModel } from 'ai'
import { mockModel } from './mock-model'

export const DEFAULT_MODELS = {
  // Flash Lite: 500 free requests a day, against 20 for Gemini 3.6/3.8 Flash
  google: 'gemini-3.5-flash-lite',
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
  if (env.AI_PROVIDER === 'mock') return mockModel()
  const { provider, modelId } = modelConfig(env)
  return provider === 'groq' ? groq(modelId) : google(modelId)
}
