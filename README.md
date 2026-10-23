# Currency Copilot

A streaming AI chat for currency questions, built with Next.js and the [Vercel AI SDK](https://ai-sdk.dev). Ask *"How much is $3,000 in reais today?"* or *"How has USD/BRL moved this month?"* and the model calls typed tools for live and historical rates. Instead of a wall of text, the answers render as React components: rate cards, history charts, and conversion tables.

> **Status:** planning and project structure. Implementation in progress.

## What it shows

- **Streaming chat** with `streamText` and the `useChat` hook
- **Tool calling** with Zod-typed inputs, executed on the server
- **Generative UI:** each tool result renders as its own component (`RateCard`, `RateHistoryChart`, `ConversionTable`)
- **Structured outputs:** `generateObject` with a Zod schema for a "should I exchange today?" summary (trend, percentile vs the last 30 days, recommendation)
- **Persistence:** chat history and saved currency pairs in Neon Postgres via Drizzle ORM
- **Multi-step tool use:** the model can chain tools, for example fetching history and then converting an amount at the best recent rate

## Tools

| Tool | Input (Zod) | Renders | Data source |
|------|-------------|---------|-------------|
| `getRate` | `{ base, quote }` | `RateCard` | [Frankfurter](https://frankfurter.dev) (ECB rates) |
| `getRateHistory` | `{ base, quote, days }` | `RateHistoryChart` | Frankfurter time series |
| `convert` | `{ amount, base, quotes[] }` | `ConversionTable` | Frankfurter |
| `analyzePair` | `{ base, quote }` | `ExchangeSummary` | History + `generateObject` |

## Stack

| Area | Choice |
|------|--------|
| Framework | Next.js (App Router), React, TypeScript |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/google`) |
| Model | Google Gemini (free tier), swappable through AI SDK providers |
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

Setup instructions will be added as the implementation lands. The plan:

```bash
cp .env.example .env.local   # add GOOGLE_GENERATIVE_AI_API_KEY and DATABASE_URL
npm install
npm run dev
```

## Free to run

- **Gemini API (AI Studio):** free tier.
- **Frankfurter:** free, no API key.
- **Neon:** free Postgres tier.
- **Vercel Hobby:** free hosting for non-commercial projects.
