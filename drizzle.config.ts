import { defineConfig } from 'drizzle-kit'

// drizzle-kit doesn't read .env.local the way Next does
try {
  process.loadEnvFile('.env.local')
} catch {}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  // Migrations need the direct connection: PgBouncer's transaction mode breaks session state
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? '' },
})
