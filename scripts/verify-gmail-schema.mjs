import process from "node:process"
import postgres from "postgres"
import { config } from "dotenv"

config({ path: ".env.local" })
config({ path: ".env" })
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured")

const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 20, idle_timeout: 5 })
try {
  const tables = await sql`select table_name from information_schema.tables where table_schema = 'public' and table_name in ('gmail_connections','email_deliveries') order by table_name`
  const columns = await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'messages' and column_name in ('provider','provider_message_id','provider_thread_id','connection_id','delivery_status') order by column_name`
  const policies = await sql`select policyname from pg_policies where schemaname = 'public' and tablename in ('gmail_connections','email_deliveries') order by policyname`
  const functions = await sql`select proname from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and proname = 'claim_gmail_delivery'`
  const expected = { tables: 2, columns: 5, policies: 7, functions: 1 }
  const actual = { tables: tables.length, columns: columns.length, policies: policies.length, functions: functions.length }
  console.log(JSON.stringify(actual))
  for (const key of Object.keys(expected)) if (actual[key] !== expected[key]) throw new Error(`Expected ${expected[key]} ${key}, found ${actual[key]}`)
  console.log("Gmail database schema verified")
} finally {
  await sql.end()
}
