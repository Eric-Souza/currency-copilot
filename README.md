# Currency Copilot

A streaming AI chat for currency questions, built with Next.js and the [Vercel AI SDK](https://ai-sdk.dev). Ask *"How much is $3,000 in reais today?"* or *"How has USD/BRL moved this month?"* and the model calls typed tools for live and historical rates. Instead of a wall of text, the answers render as React components: rate cards, history charts, and conversion tables.

> **Status:** streaming chat and `getRate` (rendered as a `RateCard`) work. The other tools, persistence, and charts are next.

## What it shows

- **Streaming chat** with `streamText` and the `useChat` hook
- **Tool calling** with Zod-typed inputs, executed on the server
- **Generative UI:** each tool result renders as its own component (`RateCard`, `RateHistoryChart`, `ConversionTable`)
- **Structured outputs:** `generateText` with `Output.object` and a Zod schema for a "should I exchange today?" summary (trend, percentile vs the last 30 days, recommendation)
- **Persistence:** chat history and saved currency pairs in Neon Postgres via Drizzle ORM
- **Multi-step tool use:** the model can chain tools, for example fetching history and then converting an amount at the best recent rate

## Tools

| Tool | Input (Zod) | Renders | Data source |
|------|-------------|---------|-------------|
| `getRate` | `{ base, quote }` | `RateCard` | [Frankfurter](https://frankfurter.dev) (ECB rates) |
| `getRateHistory` | `{ base, quote, days }` | `RateHistoryChart` | Frankfurter time series |
| `convert` | `{ amount, base, quotes[] }` | `ConversionTable` | Frankfurter |
| `analyzePair` | `{ base, quote }` | `ExchangeSummary` | History + `Output.object` |

## Stack

| Area | Choice |
|------|--------|
| Framework | Next.js (App Router), React, TypeScript |
| AI | Vercel AI SDK 6 (`ai`, `@ai-sdk/react`, `@ai-sdk/google`, `@ai-sdk/groq`) |
| Model | Google Gemini by default, or Groq, set with `AI_PROVIDER` (both free tiers) |
| Validation | Zod |
| Database | Neon Postgres + Drizzle ORM |
| UI | Tailwind CSS, shadcn/ui, Recharts |
| Tests | Vitest, Playwright |
| Hosting | Vercel Hobby |

## Project structure

```
currency-copilot/
  src/
    app/
      page.tsx              # chat UI
      api/chat/route.ts     # streamText + tools
    components/
      chat/                 # message list, input
      tool-ui/              # RateCard, RateHistoryChart, ConversionTable, ExchangeSummary
    lib/
      tools/                # tool definitions (Zod schemas + execute)
      db/                   # Drizzle schema and client
  docs/                     # screenshots, design notes
```

## Getting started

```bash
cp .env.example .env.local   # set GOOGLE_GENERATIVE_AI_API_KEY (or AI_PROVIDER=groq and GROQ_API_KEY)
npm install
npm run dev                  # http://localhost:3000
npm test                     # the chat route runs against a scripted model, no API key or network
```

| Variable | Default | What it does |
|---|---|---|
| `AI_PROVIDER` | `google` | `google` or `groq` |
| `AI_MODEL` | `gemini-3.6-flash` / `openai/gpt-oss-120b` | Overrides the provider's default model |
| `GOOGLE_GENERATIVE_AI_API_KEY` | none | From [AI Studio](https://aistudio.google.com/apikey) |
| `GROQ_API_KEY` | none | From the [Groq console](https://console.groq.com/keys) |
| `DATABASE_URL` | none | Neon Postgres for saved chats (not used yet) |

Rates are ECB reference rates, published once per working day around 16:00 CET, so they're not live market quotes, and Frankfurter covers about 30 major currencies.

## Free to run

- **Gemini API (AI Studio):** free tier.
- **Groq:** free tier, as an alternative to Gemini.
- **Frankfurter:** free, no API key.
- **Neon:** free Postgres tier.
- **Vercel Hobby:** free hosting for non-commercial projects.
