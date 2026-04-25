//Applies supabase/seed.sql (installs the seed_reachflow_for function),
//then optionally calls it for a given user email.
//
//Usage:
//  npm run db:seed                  (just installs the function)
//  npm run db:seed -- you@email.com (installs + populates data for you)
import { readFileSync } from "node:fs"
import { config } from "dotenv"
import postgres from "postgres"

config({ path: ".env.local" })
config({ path: ".env" })

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL not set in .env")
  process.exit(1)
}

const userEmail = process.argv[2]
const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 })

async function main() {
  const seedFile = readFileSync("supabase/seed.sql", "utf8")
  console.log("Applying supabase/seed.sql...")
  await sql.unsafe(seedFile)
  console.log("Seed function installed.\n")

  if (!userEmail) {
    console.log("To populate sample data for your user, run:")
    console.log("  npm run db:seed -- your-login-email@example.com\n")
    console.log("(Sign up via the app first so your auth.users row exists.)")
    return
  }

  console.log(`Looking up auth.users row for ${userEmail}...`)
  const rows = await sql`
    select id from auth.users where email = ${userEmail} limit 1
  `

  if (rows.length === 0) {
    console.error(
      `No user found with email ${userEmail}. Sign up via /sign-up first, then re-run.`,
    )
    process.exitCode = 1
    return
  }

  const userId = rows[0].id
  console.log(`Calling seed_reachflow_for(${userId})...`)
  await sql`select public.seed_reachflow_for(${userId}::uuid)`
  console.log(`Seed complete for ${userEmail}.`)

  const counts = await sql`
    select
      (select count(*) from public.prospects where user_id = ${userId}::uuid) as prospects,
      (select count(*) from public.messages where user_id = ${userId}::uuid) as messages,
      (select count(*) from public.tags where user_id = ${userId}::uuid) as tags
  `
  console.log("Row counts:", counts[0])
}

try {
  await main()
} catch (err) {
  console.error("Seed failed:", err.message)
  process.exitCode = 1
} finally {
  await sql.end({ timeout: 5 })
}
