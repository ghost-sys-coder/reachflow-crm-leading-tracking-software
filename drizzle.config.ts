import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

//load .env.local first (Next.js convention), then .env
config({ path: ".env.local" })
config({ path: ".env" })

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
})
