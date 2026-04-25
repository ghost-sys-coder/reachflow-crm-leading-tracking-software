//Verifies the DATABASE_URL in .env can reach the Supabase project.
//Run with: node scripts/test-db.mjs
import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL not set in .env.local or .env")
  process.exit(1)
}

const parsed = new URL(url)
console.log("Host:", parsed.host)
console.log("User:", decodeURIComponent(parsed.username))
console.log("DB:  ", parsed.pathname.replace(/^\//, ""))

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 })

try {
  const row = await sql`
    select now() as at, current_database() as db, current_user as u,
           version() as pg
  `.then((r) => r[0])
  console.log("Connected OK.")
  console.log(row)
} catch (err) {
  console.error("Connection failed:", err.message)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
