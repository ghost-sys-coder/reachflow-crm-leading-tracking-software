import { readFile } from "node:fs/promises"
import process from "node:process"
import postgres from "postgres"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })

const migrationPath = process.argv[2]
if (!migrationPath) throw new Error("Usage: node scripts/apply-sql-migration.mjs <migration.sql>")
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")

const migration = await readFile(migrationPath, "utf8")
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 20, idle_timeout: 5 })

try {
  await sql.begin(async (transaction) => {
    await transaction.unsafe(migration)
  })
  console.log(`Applied ${migrationPath}`)
} finally {
  await sql.end()
}
